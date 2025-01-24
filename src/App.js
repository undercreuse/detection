import React, { useState, useRef } from 'react';
import { Camera, Scan, QrCode } from 'lucide-react';
import logo from './logo.png';
import { QRCodeCanvas } from 'qrcode.react';
import { compareImages } from './imageMatching';
import { loadReferenceImages } from './utils/imageLoader';

const ObjectDetectionApp = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [referenceImages, setReferenceImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // URL pour le QR code avec l'adresse IP directe et HTTPS
  const appUrl = 'https://192.168.1.141:3000';

  // Charger les images de référence
  React.useEffect(() => {
    const loadImages = async () => {
      try {
        setLoadingImages(true);
        const images = await loadReferenceImages();
        setReferenceImages(images);
        console.log('Images de référence chargées:', images.length);
      } catch (error) {
        console.error('Erreur lors du chargement des images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImages();
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Attendre que la vidéo soit chargée
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve);
          };
        });
        console.log('Caméra démarrée avec succès');
      }
    } catch (err) {
      console.error("Erreur d'accès à la caméra:", err);
      setAnalysisResults({
        matchFound: false,
        error: `Erreur d'accès à la caméra: ${err.message}`
      });
    }
  };

  const analyzeImage = async (imageData) => {
    setIsProcessing(true);
    try {
      // Comparer avec chaque image de référence
      const results = await Promise.all(
        referenceImages.map(async (refImage) => {
          const comparison = await compareImages(imageData, refImage.data);
          return {
            ...comparison,
            referenceId: refImage.id
          };
        })
      );

      // Trouver la meilleure correspondance
      const bestMatch = results.reduce((best, current) => {
        return (current.confidence > best.confidence) ? current : best;
      }, { confidence: 0 });

      setAnalysisResults({
        matchFound: bestMatch.isMatch,
        confidence: bestMatch.confidence,
        matches: bestMatch.matches,
        totalKeypoints: bestMatch.totalKeypoints,
        referenceId: bestMatch.referenceId
      });
    } catch (error) {
      console.error("Erreur lors de l'analyse:", error);
      setAnalysisResults({
        matchFound: false,
        error: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Références vidéo ou canvas non disponibles');
      return;
    }

    try {
      setIsProcessing(true);

      // Définir une taille maximale pour l'image capturée
      const maxWidth = 1280;
      const maxHeight = 720;
      
      // Calculer les dimensions tout en conservant le ratio
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      let targetWidth = videoWidth;
      let targetHeight = videoHeight;
      
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        targetWidth = Math.floor(videoWidth * ratio);
        targetHeight = Math.floor(videoHeight * ratio);
      }

      // Configurer le canvas avec les dimensions cibles
      canvasRef.current.width = targetWidth;
      canvasRef.current.height = targetHeight;
      
      const context = canvasRef.current.getContext('2d');
      // Activer le lissage pour une meilleure qualité
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      // Dessiner l'image avec les nouvelles dimensions
      context.drawImage(
        videoRef.current,
        0, 0, videoWidth, videoHeight,
        0, 0, targetWidth, targetHeight
      );

      // Convertir en JPEG avec une qualité réduite pour optimiser la performance
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);

      // Analyser l'image de manière asynchrone
      await analyzeImage(imageData);
    } catch (error) {
      console.error('Erreur lors de la capture:', error);
      setAnalysisResults({
        matchFound: false,
        error: `Erreur lors de la capture: ${error.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleQR = () => {
    setShowQR(!showQR);
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-primary-darker flex items-center justify-center p-4">
      <div className="bg-primary w-full max-w-sm h-[90vh] rounded-xl shadow-2xl border-4 border-primary-lighter flex flex-col overflow-hidden">
        {/* En-tête avec logo et bouton QR */}
        <div className="p-4 bg-primary-light flex justify-between items-center">
          <div className="h-12 flex items-center">
            <img 
              src={logo} 
              alt="Logo Unum SOlum"
              className="h-full w-auto object-contain"
            />
          </div>
          <button
            onClick={toggleQR}
            className="ml-2 p-2 rounded-full bg-white hover:bg-primary-lighter hover:bg-opacity-20"
          >
            <QrCode className="w-6 h-6 text-primary-lighter" />
          </button>
        </div>

        {/* Modal QR Code */}
        {showQR && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
               onClick={toggleQR}>
            <div className="bg-white p-6 rounded-lg" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg text-primary">Scanner pour iPhone</h3>
                <p className="text-sm text-gray-600">Ouvrez l'appareil photo de votre iPhone et scannez ce QR code</p>
              </div>
              <QRCodeCanvas 
                value={appUrl}
                size={200}
                level="H"
                includeMargin={true}
                className="mx-auto"
              />
            </div>
          </div>
        )}

        {/* Zone de capture vidéo */}
        <div className="relative flex-1 bg-primary p-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 rounded-lg shadow-lg object-cover bg-primary-dark"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <button
            onClick={captureImage}
            disabled={isProcessing}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-3 shadow-lg disabled:opacity-50 hover:bg-primary-lighter hover:bg-opacity-20"
          >
            <Camera className="w-8 h-8 text-primary-lighter" />
          </button>
        </div>

        {/* Zone principale */}
        <div className="flex-1 p-4 flex flex-col space-y-4 overflow-y-auto">
          {loadingImages ? (
            <div className="text-center text-white">
              <p>Chargement des images de référence...</p>
            </div>
          ) : (
            <>
              {/* Zone de résultats */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-primary">
                {isProcessing && (
                  <div className="bg-primary-light rounded-lg p-4 text-white">
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 animate-spin" />
                      <p className="font-semibold">Analyse en cours</p>
                    </div>
                  </div>
                )}

                {analysisResults && !isProcessing && (
                  <div className="bg-white p-4 rounded-lg">
                    <h3 className="text-lg font-bold mb-2">Résultats de l'analyse</h3>
                    <p>
                      <span className="font-medium">Correspondance:</span>{' '}
                      {analysisResults.matchFound ? 'Trouvée' : 'Non trouvée'}
                    </p>
                    <p>
                      <span className="font-medium">Confiance:</span>{' '}
                      {analysisResults.confidence.toFixed(2)}%
                    </p>
                    <p>
                      <span className="font-medium">Points de correspondance:</span>{' '}
                      {analysisResults.matches}
                    </p>
                    <p>
                      <span className="font-medium">Points clés totaux:</span>{' '}
                      {analysisResults.totalKeypoints}
                    </p>
                    {analysisResults.referenceId && (
                      <p className="truncate">
                        <span className="font-medium">Image de référence:</span>{' '}
                        {referenceImages.find(img => img.id === analysisResults.referenceId)?.name || analysisResults.referenceId}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-primary-light rounded-lg p-3 text-white text-xs">
                <p className="font-semibold">Version de démonstration</p>
                <p className="mt-1 opacity-80">
                  Cette version simule la détection d'objets.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectDetectionApp;