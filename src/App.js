import React, { useState, useRef } from 'react';
import { Camera, Scan, QrCode } from 'lucide-react';
import logo from './logo.png';
import { QRCodeCanvas } from 'qrcode.react';

const ObjectDetectionApp = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // URL actuelle de l'application
  // Utilisez l'adresse IP locale au lieu de localhost
  const appUrl = window.location.href.replace('localhost', window.location.hostname);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          aspectRatio: { ideal: 9/19.5 },
          width: { ideal: 1080 },
          height: { ideal: 2340 }
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
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      simulateImageProcessing();
    }
  };

  const simulateImageProcessing = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const mockResults = {
        matchFound: Math.random() > 0.5,
        confidence: Math.floor(Math.random() * 100),
        fileName: "objet_exemple.jpg",
        commonFeatures: Math.floor(Math.random() * 10),
        detectedPatterns: Math.floor(Math.random() * 5) + 1
      };
      setAnalysisResults(mockResults);
      setIsProcessing(false);
    }, 1500);
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
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full hidden"
          />
          <button
            onClick={captureImage}
            disabled={isProcessing}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-full bg-primary-lighter text-white hover:bg-white hover:text-primary-lighter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Scan className="w-8 h-8 animate-spin" />
            ) : (
              <Camera className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* Zone des résultats */}
        <div className="flex-1 bg-primary-light p-4 overflow-y-auto">
          {analysisResults && (
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
                includeMargin={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectDetectionApp;