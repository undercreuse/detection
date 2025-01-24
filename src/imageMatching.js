// Attendre que OpenCV soit chargé avec timeout
const waitForOpenCV = (timeout = 10000) => {
    return new Promise((resolve, reject) => {
        if (window.cv) {
            resolve(window.cv);
        } else {
            const startTime = Date.now();
            const interval = setInterval(() => {
                if (window.cv) {
                    clearInterval(interval);
                    resolve(window.cv);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(new Error('Timeout en attendant OpenCV'));
                }
            }, 100);
        }
    });
};

export const compareImages = async (capturedImageData, referenceImageData, threshold = 0.7) => {
    let capturedMat = null;
    let referenceMat = null;
    let capturedGray = null;
    let referenceGray = null;
    let des1 = null;
    let des2 = null;
    let kp1 = null;
    let kp2 = null;
    let matches = null;
    let orb = null;

    try {
        const cv = await waitForOpenCV();
        
        // Charger et redimensionner les images si nécessaire
        const loadAndResizeImage = async (imageData, maxSize = 800) => {
            const img = await createImageElement(imageData);
            const mat = cv.imread(img);
            
            // Redimensionner si l'image est trop grande
            if (mat.cols > maxSize || mat.rows > maxSize) {
                const scale = maxSize / Math.max(mat.cols, mat.rows);
                const newSize = new cv.Size(Math.floor(mat.cols * scale), Math.floor(mat.rows * scale));
                const resized = new cv.Mat();
                cv.resize(mat, resized, newSize, 0, 0, cv.INTER_AREA);
                mat.delete();
                return resized;
            }
            return mat;
        };

        // Charger et redimensionner les images
        capturedMat = await loadAndResizeImage(capturedImageData);
        referenceMat = await loadAndResizeImage(referenceImageData);

        // Convertir en niveaux de gris
        capturedGray = new cv.Mat();
        referenceGray = new cv.Mat();
        cv.cvtColor(capturedMat, capturedGray, cv.COLOR_RGBA2GRAY);
        cv.cvtColor(referenceMat, referenceGray, cv.COLOR_RGBA2GRAY);

        // Initialiser ORB avec moins de points caractéristiques pour plus de performance
        orb = new cv.ORB(250);

        // Détecter les keypoints et calculer les descripteurs
        kp1 = new cv.KeyPointVector();
        kp2 = new cv.KeyPointVector();
        des1 = new cv.Mat();
        des2 = new cv.Mat();

        orb.detect(capturedGray, kp1);
        orb.detect(referenceGray, kp2);
        orb.compute(capturedGray, kp1, des1);
        orb.compute(referenceGray, kp2, des2);

        // Vérifier si des points caractéristiques ont été trouvés
        if (kp1.size() === 0 || kp2.size() === 0) {
            throw new Error('Pas assez de points caractéristiques trouvés');
        }

        // Matcher les descripteurs avec une distance maximale réduite
        const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
        matches = new cv.DMatchVector();
        bf.match(des1, des2, matches);

        // Filtrer les bons matches avec une distance maximale plus stricte
        const goodMatches = [];
        const maxDistance = 40;

        for (let i = 0; i < matches.size(); i++) {
            const match = matches.get(i);
            if (match.distance < maxDistance) {
                goodMatches.push(match);
            }
        }

        // Calculer le score de similarité
        const matchRatio = goodMatches.length / Math.min(kp1.size(), kp2.size());

        return {
            isMatch: matchRatio > threshold,
            confidence: matchRatio * 100,
            matches: goodMatches.length,
            totalKeypoints: Math.min(kp1.size(), kp2.size())
        };
    } catch (error) {
        console.error("Erreur lors de la comparaison des images:", error);
        return {
            isMatch: false,
            confidence: 0,
            error: error.message
        };
    } finally {
        // Nettoyer la mémoire
        const matsToDelete = [
            capturedMat, referenceMat, capturedGray, referenceGray,
            des1, des2, kp1, kp2, matches, orb
        ];
        
        for (const mat of matsToDelete) {
            if (mat) {
                try {
                    mat.delete();
                } catch (e) {
                    console.warn('Erreur lors de la suppression de la matrice:', e);
                }
            }
        }
    }
};

// Fonction utilitaire pour créer un élément Image à partir d'une URL de données
const createImageElement = (imageData) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageData;
    });
};
