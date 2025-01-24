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
    const gray = new cv.Mat();
    cv.cvtColor(imageMat, gray, cv.COLOR_RGBA2GRAY);

    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    const binary = new cv.Mat();
    cv.threshold(blurred, binary, 127, 255, cv.THRESH_BINARY);

    gray.delete();
    blurred.delete();

    return binary;
  }

  async compareImages(queryImage, referenceImage) {
    try {
      const processedQuery = await this.preprocessImage(queryImage);
      const processedRef = await this.preprocessImage(referenceImage);

      // Calcul de la différence absolue
      const diff = new cv.Mat();
      cv.absdiff(processedQuery, processedRef, diff);

      // Calcul du score de similarité
      const totalPixels = diff.rows * diff.cols;
      const differentPixels = cv.countNonZero(diff);
      const similarityScore = 1 - (differentPixels / totalPixels);

      // Nettoyage
      processedQuery.delete();
      processedRef.delete();
      diff.delete();

      return {
        score: similarityScore,
        isMatch: similarityScore > 0.8
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