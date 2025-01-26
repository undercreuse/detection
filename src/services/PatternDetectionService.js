/* global cv */
import React from 'react';

export default class PatternDetectionService {
    static instance = null;
    static isInitializing = false;
    static opencvLoaded = false;
    static opencvLoadPromise = null;

    constructor() {
        if (PatternDetectionService.instance) {
            return PatternDetectionService.instance;
        }

        this.sourceImages = [
            '/images-source/unum1.png',
            '/images-source/unum2.png', 
            '/images-source/unum3.png', 
            '/images-source/unum4.png'
        ];
        this.logoTemplate = null;
        this.isReady = false;
        
        PatternDetectionService.instance = this;
        
        // Charger OpenCV une seule fois
        this.initializeOpenCVOnce();
    }

    static getInstance() {
        if (!PatternDetectionService.instance) {
            PatternDetectionService.instance = new PatternDetectionService();
        }
        return PatternDetectionService.instance;
    }

    async initializeOpenCVOnce() {
        // Si déjà chargé, retourner immédiatement
        if (PatternDetectionService.opencvLoaded) {
            await this.initLogoTemplate();
            return;
        }

        // Si un chargement est en cours, attendre
        if (PatternDetectionService.opencvLoadPromise) {
            return PatternDetectionService.opencvLoadPromise;
        }

        // Nouvelle promesse de chargement
        PatternDetectionService.opencvLoadPromise = new Promise((resolve, reject) => {
            // Vérifier si OpenCV est déjà disponible
            if (typeof cv !== 'undefined' && cv.Mat) {
                console.log('OpenCV déjà disponible');
                PatternDetectionService.opencvLoaded = true;
                this.initLogoTemplate().then(resolve).catch(reject);
                return;
            }

            // Configuration du module OpenCV avant le chargement
            window.Module = window.Module || {};
            window.Module.onRuntimeInitialized = () => {
                console.log('OpenCV Runtime initialisé');
                
                // Vérifier la disponibilité de cv
                const checkOpenCVReady = () => {
                    if (typeof cv !== 'undefined' && cv.Mat) {
                        PatternDetectionService.opencvLoaded = true;
                        this.initLogoTemplate()
                            .then(() => resolve())
                            .catch(reject);
                    } else {
                        setTimeout(checkOpenCVReady, 100);
                    }
                };

                checkOpenCVReady();
            };

            // Supprimer tous les scripts OpenCV existants
            document.querySelectorAll('script[src*="opencv.js"]').forEach(script => script.remove());

            // Charger le script OpenCV
            const script = document.createElement('script');
            script.src = '/opencv/opencv.js';  // Chemin corrigé
            script.async = true;
            script.onerror = (error) => {
                console.error('Erreur de chargement du script OpenCV', error);
                reject(error);
            };
            document.head.appendChild(script);

            // Timeout de sécurité
            const loadTimeout = setTimeout(() => {
                if (!PatternDetectionService.opencvLoaded) {
                    console.error('OpenCV non chargé après 15 secondes');
                    reject(new Error('Chargement de OpenCV timeout'));
                }
            }, 15000);
        });

        return PatternDetectionService.opencvLoadPromise;
    }

    async initLogoTemplate() {
        return new Promise((resolve, reject) => {
            try {
                console.log('Début de initLogoTemplate');
                
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                
                img.onload = () => {
                    console.log('Image logo chargée');
                    try {
                        // Vérifier que cv.Mat est disponible
                        if (typeof cv === 'undefined' || !cv.Mat) {
                            throw new Error('OpenCV non initialisé');
                        }

                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        // Obtenir les données de l'image
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // Créer la matrice OpenCV de manière sécurisée
                        const sourceMat = cv.matFromImageData(imageData);

                        // Convertir en niveaux de gris
                        const gray = new cv.Mat();
                        cv.cvtColor(sourceMat, gray, cv.COLOR_RGBA2GRAY);
                        
                        // Détection de features ORB
                        const orb = new cv.ORB();
                        const keypoints = new cv.KeyPointVector();
                        const descriptors = new cv.Mat();
                        orb.detect(gray, keypoints);
                        orb.compute(gray, keypoints, descriptors);
                        
                        this.logoTemplate = {
                            keypoints: keypoints,
                            descriptors: descriptors,
                            method: 'ORB'
                        };
                        
                        this.isReady = true;
                        console.log('Logo template initialisé avec ORB');
                        resolve();
                    } catch (processError) {
                        console.error('Erreur de traitement de l\'image', processError);
                        reject(processError);
                    }
                };
                
                img.onerror = (error) => {
                    console.error("Erreur de chargement du logo template", error);
                    reject(error);
                };
                
                img.src = '/images-source/logoUS.png'; 
            } catch (error) {
                console.error('Erreur globale dans initLogoTemplate', error);
                reject(error);
            }
        });
    }

    async compareImages(capturedImageDataUrl) {
        if (!this.isReady) {
            await this.initLogoTemplate();
        }

        const comparisons = [];

        for (const sourceImagePath of this.sourceImages) {
            try {
                const comparisonResult = await this.compareImagePair(sourceImagePath, capturedImageDataUrl);
                comparisons.push(comparisonResult);
            } catch (error) {
                console.error(`Erreur lors de la comparaison avec ${sourceImagePath}:`, error);
                comparisons.push({
                    sourceImage: sourceImagePath,
                    capturedImage: capturedImageDataUrl,
                    comparisonImageDataUrl: null,
                    similarityScore: 0,
                    comparisonInfo: 'Comparaison impossible'
                });
            }
        }

        return comparisons;
    }

    async compareImagePair(sourceImagePath, capturedImageDataUrl) {
        if (!this.isReady) {
            throw new Error('Service de détection non initialisé');
        }

        return new Promise((resolve, reject) => {
            const sourceImage = new Image();
            const capturedImage = new Image();

            sourceImage.crossOrigin = 'Anonymous';
            capturedImage.crossOrigin = 'Anonymous';

            sourceImage.onload = () => {
                capturedImage.onload = () => {
                    try {
                        // Vérifier que cv.Mat est disponible
                        if (typeof cv === 'undefined' || !cv.Mat) {
                            throw new Error('OpenCV non initialisé');
                        }

                        // Créer des canvas pour les images
                        const sourceCanvas = document.createElement('canvas');
                        sourceCanvas.width = sourceImage.width;
                        sourceCanvas.height = sourceImage.height;
                        const sourceCtx = sourceCanvas.getContext('2d');
                        sourceCtx.drawImage(sourceImage, 0, 0);

                        const capturedCanvas = document.createElement('canvas');
                        capturedCanvas.width = capturedImage.width;
                        capturedCanvas.height = capturedImage.height;
                        const capturedCtx = capturedCanvas.getContext('2d');
                        capturedCtx.drawImage(capturedImage, 0, 0);

                        // Obtenir les données des images
                        const sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
                        const capturedImageData = capturedCtx.getImageData(0, 0, capturedCanvas.width, capturedCanvas.height);

                        // Créer des matrices OpenCV via matFromImageData
                        const sourceMat = cv.matFromImageData(sourceImageData);
                        const capturedMat = cv.matFromImageData(capturedImageData);

                        // Convertir en niveaux de gris
                        const sourceGray = new cv.Mat();
                        const capturedGray = new cv.Mat();
                        cv.cvtColor(sourceMat, sourceGray, cv.COLOR_RGBA2GRAY);
                        cv.cvtColor(capturedMat, capturedGray, cv.COLOR_RGBA2GRAY);

                        // Détection de features ORB
                        const orb = new cv.ORB();
                        const sourceKeypoints = new cv.KeyPointVector();
                        const sourceDescriptors = new cv.Mat();
                        const capturedKeypoints = new cv.KeyPointVector();
                        const capturedDescriptors = new cv.Mat();

                        orb.detect(sourceGray, sourceKeypoints);
                        orb.compute(sourceGray, sourceKeypoints, sourceDescriptors);
                        orb.detect(capturedGray, capturedKeypoints);
                        orb.compute(capturedGray, capturedKeypoints, capturedDescriptors);

                        // Matching des descripteurs
                        const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
                        const matches = new cv.DMatchVector();
                        matcher.match(sourceDescriptors, capturedDescriptors, matches);

                        // Calculer le score de similarité
                        const goodMatches = Array.from({length: matches.size()}, (_, i) => matches.get(i))
                            .filter(match => match.distance < 50);
                        
                        const similarityScore = goodMatches.length / Math.max(sourceKeypoints.size(), capturedKeypoints.size());

                        // Créer une image de comparaison
                        const comparisonCanvas = document.createElement('canvas');
                        comparisonCanvas.width = Math.max(sourceImage.width, capturedImage.width);
                        comparisonCanvas.height = Math.max(sourceImage.height, capturedImage.height);
                        const comparisonCtx = comparisonCanvas.getContext('2d');
                        
                        comparisonCtx.globalAlpha = 0.5;
                        comparisonCtx.drawImage(sourceImage, 0, 0);
                        comparisonCtx.drawImage(capturedImage, 0, 0);

                        resolve({
                            sourceImage: sourceImagePath,
                            capturedImage: capturedImageDataUrl,
                            comparisonImageDataUrl: comparisonCanvas.toDataURL('image/jpeg'),
                            comparisonInfo: `Similarité : ${(similarityScore * 100).toFixed(2)}% (${goodMatches.length} correspondances)`,
                            correspondance: goodMatches.length,
                            similarity: (similarityScore * 100).toFixed(2)
                        });

                        // Libérer la mémoire
                        sourceMat.delete();
                        capturedMat.delete();
                        sourceGray.delete();
                        capturedGray.delete();
                        sourceDescriptors.delete();
                        capturedDescriptors.delete();
                        matcher.delete();
                    } catch (error) {
                        console.error("Erreur dans compareImagePair :", error);
                        reject(error);
                    }
                };
                capturedImage.src = capturedImageDataUrl;
            };
            
            sourceImage.src = window.location.origin + sourceImagePath;
        });
    }
}