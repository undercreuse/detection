class PatternDetectionService {
  constructor() {
    console.log('Initializing PatternDetectionService');
    this.sourceImages = [];
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
    const sourceUrls = [
      '/images-source/unum1.png',
      '/images-source/unum2.png',
      '/images-source/unum3.png',
      '/images-source/unum4.png'
    ];

    try {
      this.sourceImages = await Promise.all(
        sourceUrls.map(async (url, index) => {
          console.log(`Loading image ${index + 1}/${sourceUrls.length}: ${url}`);
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
}

export default new PatternDetectionService();