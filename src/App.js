import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, QrCode } from 'lucide-react';
import logo from './logo.png';
import { QRCodeCanvas } from 'qrcode.react';
import PatternDetectionService from './services/PatternDetectionService';

const ObjectDetectionApp = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isServiceReady, setIsServiceReady] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // URL actuelle de l'application
  const appUrl = window.location.href.replace('localhost', window.location.hostname);

  useEffect(() => {
    const checkServiceStatus = setInterval(() => {
      if (PatternDetectionService.isInitialized) {
        setIsServiceReady(true);
        clearInterval(checkServiceStatus);
      }
    }, 1000);

    return () => clearInterval(checkServiceStatus);
  }, []);

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      setVideoSize({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erreur d'accès à la caméra:", err);
    }
  };

  const captureImage = () => {
    if (!isServiceReady) {
      console.warn("Le service de détection n'est pas encore prêt");
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Calculer les dimensions pour la capture (1:3)
      const captureWidth = video.videoHeight * 0.267;
      const captureHeight = captureWidth * 3;
      const startX = (video.videoWidth - captureWidth) / 2;
      const startY = (video.videoHeight - captureHeight) / 2;

      // Configurer le canvas pour la capture
      canvas.width = captureWidth;
      canvas.height = captureHeight;

      // Capturer uniquement la zone du rectangle
      context.drawImage(
        video,
        startX, startY, captureWidth, captureHeight,
        0, 0, captureWidth, captureHeight
      );

      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      processImage(imageData);
    }
  };

  const processImage = async (imageData) => {
    setIsProcessing(true);
    try {
      const results = await PatternDetectionService.detectPattern(imageData);
      if (results) {
        setAnalysisResults(results);
      } else {
        setAnalysisResults({
          matchFound: false,
          confidence: 0,
          fileName: "Aucune correspondance",
          commonFeatures: 0,
          detectedPatterns: 0
        });
      }
    } catch (error) {
      console.error("Erreur lors de la détection:", error);
      setAnalysisResults({
        matchFound: false,
        confidence: 0,
        fileName: "Erreur de détection",
        commonFeatures: 0,
        detectedPatterns: 0
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

  // Calculer les dimensions du rectangle de cadrage
  const getCropGuideStyle = () => {
    if (!videoSize.width || !videoSize.height) return {};

    // Dimensions basées sur la hauteur pour maintenir le ratio 1:3
    const width = videoSize.height * 0.267;
    const height = width * 3;
    const left = (videoSize.width - width) / 2;
    const top = (videoSize.height - height) / 2;

    return {
      left: `${(left / videoSize.width) * 100}%`,
      top: `${(top / videoSize.height) * 100}%`,
      width: `${(width / videoSize.width) * 100}%`,
      height: `${(height / videoSize.height) * 100}%`
    };
  };

  return (
    <div className="min-h-screen bg-primary-darker flex items-center justify-center p-4">
      <div className="bg-primary w-full max-w-sm h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
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
            className="ml-2 p-2 rounded-full bg-primary-lighter hover:bg-white"
          >
            <QrCode className="w-6 h-6 text-white hover:text-primary-lighter" />
          </button>
        </div>

        {/* Zone de la caméra */}
        <div className="relative flex-[2] bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            onLoadedMetadata={handleVideoMetadata}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full hidden"
          />
          {/* Rectangle de cadrage 1:3 */}
          <div 
            className="absolute border-2 border-white rounded-lg"
            style={getCropGuideStyle()}
          >
            {/* Coins du rectangle */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br"></div>
          </div>
          <button
            onClick={captureImage}
            disabled={isProcessing || !isServiceReady}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-full bg-primary-lighter text-white hover:bg-white hover:text-primary-lighter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Scan className="w-8 h-8 animate-spin" />
            ) : !isServiceReady ? (
              <div className="flex items-center space-x-2">
                <Scan className="w-8 h-8 animate-pulse" />
              </div>
            ) : (
              <Camera className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* Zone des résultats et image capturée */}
        <div className="flex-1 bg-primary-light p-4 overflow-y-auto">
          {!isServiceReady && (
            <div className="text-white text-center">
              <p>Initialisation du service de détection...</p>
              <div className="mt-2">
                <Scan className="w-6 h-6 animate-spin mx-auto" />
              </div>
            </div>
          )}
          {analysisResults && (
            <div className="space-y-4">
              <div className="space-y-2 text-white">
                <div className="flex items-center justify-between">
                  <span>Correspondance trouvée:</span>
                  <span className={analysisResults.matchFound ? "text-green-400" : "text-red-400"}>
                    {analysisResults.matchFound ? "Oui" : "Non"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Confiance:</span>
                  <span>{analysisResults.confidence}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Motifs détectés:</span>
                  <span>{analysisResults.detectedPatterns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Caractéristiques communes:</span>
                  <span>{analysisResults.commonFeatures}</span>
                </div>
                {analysisResults.rectangles && (
                  <div className="flex items-center justify-between">
                    <span>Rectangles détectés:</span>
                    <span className={analysisResults.rectangles.found ? "text-green-400" : "text-red-400"}>
                      {analysisResults.rectangles.count}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Image capturée avec rectangles */}
              {capturedImage && (
                <div className="mt-4">
                  <p className="text-white mb-2 text-sm">Image capturée :</p>
                  <div className="rounded-lg overflow-hidden border-2 border-primary-lighter relative">
                    <img 
                      src={capturedImage} 
                      alt="Capture" 
                      className="w-full h-auto"
                    />
                    {analysisResults.rectangles?.coordinates.map((rect, index) => (
                      <svg
                        key={index}
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ pointerEvents: 'none' }}
                      >
                        <polygon
                          points={rect.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#00ff00"
                          strokeWidth="2"
                        />
                      </svg>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectDetectionApp;