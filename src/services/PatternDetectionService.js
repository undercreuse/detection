class PatternDetectionService {
  constructor() {
    console.log('Initializing PatternDetectionService');
    this.sourceImages = [
      '/images-source/unum1.png',
      '/images-source/unum2.png', 
      '/images-source/unum3.png', 
      '/images-source/unum4.png'
    ];
    console.log("Chemins des images sources :", this.sourceImages);
    this.isInitialized = false;
    this.initPromise = null;
    this.initialize();
  }

  initialize() {
    this.initPromise = new Promise((resolve) => {
      const maxAttempts = 10;
      let attempts = 0;

      const checkOpenCV = () => {
        attempts++;
        console.log(`Checking OpenCV availability (attempt ${attempts}/${maxAttempts})`);

        if (window.cv && typeof window.cv.Mat === 'function') {
          console.log('OpenCV is available, loading source images...');
          this.loadSourceImages().then(() => {
            this.isInitialized = true;
            resolve();
          }).catch(error => {
            console.error('Failed to load source images:', error);
            resolve();
          });
        } else if (attempts < maxAttempts) {
          console.log('OpenCV not yet available, waiting...');
          setTimeout(checkOpenCV, 1000);
        } else {
          console.error('OpenCV failed to load after maximum attempts');
          resolve();
        }
      };

      checkOpenCV();
    });
  }

  async loadSourceImages() {
    try {
      this.sourceImages = await Promise.all(
        this.sourceImages.map(async (url, index) => {
          console.log(`Loading image ${index + 1}/${this.sourceImages.length}: ${url}`);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to load image: ${url}`);
          }
          const blob = await response.blob();
          const img = await this.blobToImage(blob);
          console.log(`Computing descriptors for image ${index + 1}`);
          const descriptors = await this.computeImageDescriptors(img);
          return { url, descriptors };
        })
      );
      console.log(`Loaded ${this.sourceImages.length} source images successfully`);
    } catch (error) {
      console.error('Error loading source images:', error);
      throw error;
    }
  }

  async blobToImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }

  async computeImageDescriptors(img) {
    if (!window.cv || !window.cv.Mat) {
      throw new Error('OpenCV not properly initialized');
    }

    const mat = window.cv.imread(img);
    const gray = new window.cv.Mat();
    window.cv.cvtColor(mat, gray, window.cv.COLOR_RGBA2GRAY);

    const orb = new window.cv.ORB();
    const keypoints = new window.cv.KeyPointVector();
    const descriptors = new window.cv.Mat();
    
    orb.detect(gray, keypoints);
    orb.compute(gray, keypoints, descriptors);

    mat.delete();
    gray.delete();
    orb.delete();

    return {
      keypoints,
      descriptors
    };
  }

  async detectPattern(capturedImage) {
    if (!this.isInitialized) {
      await this.initPromise;
      if (!this.isInitialized) {
        throw new Error('Service failed to initialize');
      }
    }

    try {
      const img = await this.dataURLToImage(capturedImage);
      const capturedDescriptors = await this.computeImageDescriptors(img);
      
      // Détecter les rectangles
      const rectangles = await this.detectRectangles(img);

      const matches = await Promise.all(
        this.sourceImages.map(async (sourceImage) => {
          const matchCount = this.matchDescriptors(
            capturedDescriptors.descriptors,
            sourceImage.descriptors.descriptors
          );

          return {
            sourceUrl: sourceImage.url,
            matchCount,
            confidence: this.calculateConfidence(matchCount, sourceImage.descriptors.keypoints.size())
          };
        })
      );

      const bestMatch = matches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      return {
        matchFound: bestMatch.confidence > 0.6,
        confidence: Math.round(bestMatch.confidence * 100),
        fileName: bestMatch.sourceUrl.split('/').pop(),
        detectedPatterns: bestMatch.matchCount,
        commonFeatures: Math.round(bestMatch.matchCount * 0.8),
        rectangles: {
          count: rectangles.length,
          found: rectangles.length > 0,
          coordinates: rectangles
        }
      };
    } catch (error) {
      console.error('Error in pattern detection:', error);
      throw error;
    }
  }

  async dataURLToImage(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataURL;
    });
  }

  async detectRectangles(img) {
    const src = window.cv.imread(img);
    const dst = new window.cv.Mat();
    const gray = new window.cv.Mat();
    const edges = new window.cv.Mat();
    const contours = new window.cv.MatVector();
    const hierarchy = new window.cv.Mat();
    const rectangles = [];

    try {
      // Convertir en niveaux de gris
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      
      // Appliquer un flou gaussien pour réduire le bruit
      window.cv.GaussianBlur(gray, gray, new window.cv.Size(5, 5), 0);
      
      // Détection des contours avec Canny
      window.cv.Canny(gray, edges, 50, 150, 3, false);
      
      // Trouver les contours
      window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);

      // Analyser chaque contour
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const perimeter = window.cv.arcLength(contour, true);
        const approx = new window.cv.Mat();
        
        // Approximer le contour
        window.cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

        // Si le contour a 4 points et une aire suffisante, c'est probablement un rectangle
        if (approx.rows === 4) {
          const area = window.cv.contourArea(contour);
          if (area > 1000) { // Filtrer les trop petits rectangles
            // Extraire les coordonnées du rectangle
            const points = [];
            for (let j = 0; j < 4; j++) {
              const point = approx.data32S.slice(j * 2, (j * 2) + 2);
              points.push({ x: point[0], y: point[1] });
            }
            rectangles.push(points);
          }
        }
        
        approx.delete();
      }

      return rectangles;
    } finally {
      // Libérer la mémoire
      src.delete();
      dst.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    }
  }

  matchDescriptors(desc1, desc2) {
    const matcher = new window.cv.BFMatcher();
    const matches = new window.cv.DMatchVector();
    
    matcher.match(desc1, desc2, matches);

    const goodMatches = this.filterGoodMatches(matches);
    
    matcher.delete();
    matches.delete();

    return goodMatches.length;
  }

  filterGoodMatches(matches) {
    const matchesArray = [];
    for (let i = 0; i < matches.size(); i++) {
      matchesArray.push(matches.get(i));
    }

    matchesArray.sort((a, b) => a.distance - b.distance);

    const goodMatches = matchesArray.filter((match, i) => 
      i < 50 && match.distance < 2 * matchesArray[0].distance
    );

    return goodMatches;
  }

  calculateConfidence(matchCount, keypointCount) {
    const ratio = matchCount / keypointCount;
    return Math.min(ratio * 2, 1);
  }

  async compareImages(capturedImageDataUrl) {
    console.log("Début de compareImages avec l'image :", capturedImageDataUrl ? capturedImageDataUrl.substring(0, 50) + '...' : 'Pas d\'image');
    
    if (!capturedImageDataUrl) {
      console.error("Aucune image capturée");
      return [];
    }

    const comparisons = [];

    try {
      console.log("Début de la boucle de comparaison");
      for (const sourceImagePath of this.sourceImages) {
        console.log("Tentative de comparaison avec l'image source :", sourceImagePath);
        
        try {
          console.log(`Début de compareImagePair pour ${sourceImagePath}`);
          const comparisonResult = await this.compareImagePair(sourceImagePath, capturedImageDataUrl);
          console.log(`Résultat de compareImagePair pour ${sourceImagePath} :`, comparisonResult);
          comparisons.push(comparisonResult);
        } catch (pairComparisonError) {
          console.error(`Erreur lors de la comparaison avec ${sourceImagePath}:`, pairComparisonError);
          
          // Générer un résultat par défaut en cas d'erreur
          comparisons.push({
            sourceImage: sourceImagePath, // Utiliser directement le chemin
            capturedImage: capturedImageDataUrl || null,
            comparisonImageDataUrl: null,
            similarityScore: 0,
            comparisonInfo: 'Comparaison impossible'
          });
        }
      }
    } catch (error) {
      console.error("Erreur globale lors de la comparaison des images :", error);
    }

    console.log("Nombre de comparaisons effectuées :", comparisons.length);
    return comparisons;
  }

  async compareImagePair(sourceImagePath, capturedImageDataUrl) {
    return new Promise((resolve, reject) => {
      const sourceImage = new Image();
      const capturedImage = new Image();

      sourceImage.crossOrigin = 'Anonymous';
      capturedImage.crossOrigin = 'Anonymous';

      sourceImage.onerror = (e) => {
        console.error("Erreur de chargement de l'image source :", e, sourceImagePath);
        reject(e);
      };

      capturedImage.onerror = (e) => {
        console.error("Erreur de chargement de l'image capturée :", e);
        reject(e);
      };

      sourceImage.onload = () => {
        console.log("Image source chargée avec succès");
        capturedImage.onload = () => {
          console.log("Image capturée chargée avec succès");
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Redimensionner les images à la même taille
          canvas.width = Math.min(sourceImage.width, capturedImage.width);
          canvas.height = Math.min(sourceImage.height, capturedImage.height);

          // Dessiner les images sur le canvas
          ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 0.5;
          ctx.drawImage(capturedImage, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

          // Calculer une métrique de similarité simple
          const comparisonImageDataUrl = canvas.toDataURL('image/jpeg');
          const similarityScore = this.calculateSimilarityScore(sourceImage, capturedImage);

          resolve({
            sourceImage: sourceImagePath, // Utiliser directement le chemin
            capturedImage: capturedImageDataUrl,
            comparisonImageDataUrl: comparisonImageDataUrl,
            similarityScore: similarityScore,
            comparisonInfo: `Similarité : ${(similarityScore * 100).toFixed(2)}%`
          });
        };
        capturedImage.src = capturedImageDataUrl;
      };
      
      // Charger l'image source avec le chemin complet
      const fullSourcePath = window.location.origin + sourceImagePath;
      console.log(`Chargement de l'image source à partir de :`, fullSourcePath);
      sourceImage.src = fullSourcePath;
    });
  }

  calculateSimilarityScore(img1, img2) {
    // Une méthode simple de calcul de similarité basée sur les dimensions
    const widthSimilarity = 1 - Math.abs(img1.width - img2.width) / Math.max(img1.width, img2.width);
    const heightSimilarity = 1 - Math.abs(img1.height - img2.height) / Math.max(img1.height, img2.height);
    
    return (widthSimilarity + heightSimilarity) / 2;
  }
}

export default new PatternDetectionService();