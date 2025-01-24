// src/services/PatternDetectionService.js
import cv from '@techstark/opencv-js';

class PatternDetectionService {
  async initOpenCV() {
    if (cv instanceof Promise) {
      await cv;
    }
    return cv;
  }

  async preprocessImage(imageMat) {
    // Conversion en niveaux de gris
    const gray = new cv.Mat();
    cv.cvtColor(imageMat, gray, cv.COLOR_RGBA2GRAY);

    // Réduction du bruit
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Détection des contours avec Canny
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150, 3);

    // Libération de la mémoire
    gray.delete();
    blurred.delete();

    return edges;
  }

  async detectFeatures(imageMat) {
    // Création du détecteur ORB
    const orb = new cv.ORB(500);
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();

    // Détection et calcul des descripteurs
    orb.detect(imageMat, keypoints);
    orb.compute(imageMat, keypoints, descriptors);

    return { keypoints, descriptors };
  }

  async compareImages(queryImage, referenceImage) {
    try {
      // Prétraitement des images
      const processedQuery = await this.preprocessImage(queryImage);
      const processedRef = await this.preprocessImage(referenceImage);

      // Extraction des caractéristiques
      const queryFeatures = await this.detectFeatures(processedQuery);
      const refFeatures = await this.detectFeatures(processedRef);

      // Matching des caractéristiques
      const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
      const matches = matcher.match(queryFeatures.descriptors, refFeatures.descriptors);

      // Filtrage des bons matches
      const goodMatches = matches.filter(match => match.distance < 50);
      const matchScore = goodMatches.length / matches.length;

      // Nettoyage
      processedQuery.delete();
      processedRef.delete();
      queryFeatures.keypoints.delete();
      queryFeatures.descriptors.delete();
      refFeatures.keypoints.delete();
      refFeatures.descriptors.delete();

      return {
        score: matchScore,
        matches: goodMatches.length,
        isMatch: matchScore > 0.4
      };
    } catch (error) {
      console.error('Erreur lors de la comparaison:', error);
      throw error;
    }
  }

  async loadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const mat = cv.imread(canvas);
        resolve(mat);
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }
}

export default new PatternDetectionService();