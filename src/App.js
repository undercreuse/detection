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
  const overlayCanvasRef = useRef(null);

  const appUrl = 'https://192.168.1.51:3000';

  const calculateGuideRect = (videoWidth, videoHeight) => {
    // On calcule d'abord la largeur maximale possible (80% de la largeur de la vidéo)
    const maxWidth = videoWidth * 0.8;
    // Et la hauteur maximale possible (80% de la hauteur de la vidéo)
    const maxHeight = videoHeight * 0.8;

    let rectWidth, rectHeight;

    // Pour un ratio 1:4, si on part de la largeur
    const heightFromWidth = maxWidth * 4;
    // Si on part de la hauteur
    const widthFromHeight = maxHeight / 4;

    // On choisit les dimensions qui respectent le ratio 1:4 et tiennent dans l'écran
    if (heightFromWidth <= maxHeight) {
      // Si la hauteur calculée depuis la largeur tient dans l'écran
      rectWidth = maxWidth;
      rectHeight = heightFromWidth;
    } else {
      // Sinon on part de la hauteur maximale
      rectWidth = widthFromHeight;
      rectHeight = maxHeight;
    }

    // Centrage du rectangle
    const x = (videoWidth - rectWidth) / 2;
    const y = (videoHeight - rectHeight) / 2;
    
    return { 
      x, 
      y, 
      width: rectWidth, 
      height: rectHeight
    };
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
        videoRef.current.onloadedmetadata = () => {
          if (overlayCanvasRef.current) {
            overlayCanvasRef.current.width = videoRef.current.videoWidth;
            overlayCanvasRef.current.height = videoRef.current.videoHeight;
          }
          drawRectangleGuide();
        };
      }
    } catch (err) {
      console.error("Erreur d'accès à la caméra:", err);
    }
  };

  const drawRectangleGuide = () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Utiliser la fonction utilitaire pour calculer les dimensions
    const guideRect = calculateGuideRect(canvas.width, canvas.height);
    
    // Dessiner un fond semi-transparent autour de la zone de capture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Effacer la zone du rectangle guide pour la rendre transparente
    ctx.clearRect(guideRect.x, guideRect.y, guideRect.width, guideRect.height);

    // Dessiner le rectangle guide
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(guideRect.x, guideRect.y, guideRect.width, guideRect.height);

    // Dessiner les coins
    const corners = [
      { x: guideRect.x, y: guideRect.y },
      { x: guideRect.x + guideRect.width, y: guideRect.y },
      { x: guideRect.x, y: guideRect.y + guideRect.height },
      { x: guideRect.x + guideRect.width, y: guideRect.y + guideRect.height }
    ];

    corners.forEach(corner => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FF00';
      ctx.fill();
    });

    requestAnimationFrame(drawRectangleGuide);
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

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Calculer les dimensions du rectangle guide
      const guideRect = calculateGuideRect(video.videoWidth, video.videoHeight);
      
      // Définir la taille du canvas à la taille de la zone de capture
      canvas.width = guideRect.width;
      canvas.height = guideRect.height;
      
      // Extraire uniquement la zone du viseur
      context.drawImage(
        video,
        guideRect.x,    // Source X
        guideRect.y,    // Source Y
        guideRect.width,  // Source Width
        guideRect.height, // Source Height
        0,              // Destination X
        0,              // Destination Y
        guideRect.width,  // Destination Width
        guideRect.height  // Destination Height
      );
      
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageData);
      simulateImageProcessing();
    }
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
        {/* Header redesigné */}
        <div className="px-4 py-2 bg-primary-light flex justify-between items-center">
          <div className="h-10 w-10 flex items-center">
            <img 
              src={logo} 
              alt="Logo Unum Solum"
              className="h-full w-full object-contain"
            />
          </div>
          <button
            onClick={toggleQR}
            className="p-2 rounded-full bg-white hover:bg-primary-lighter hover:bg-opacity-20 h-10 w-10 flex items-center justify-center"
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
              />
            </div>
          </div>
        )}

        {/* Zone de capture vidéo */}
        <div className="relative flex-1 bg-primary p-4">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full rounded-lg shadow-lg object-cover bg-primary-dark"
            />
            <canvas 
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <canvas 
              ref={canvasRef} 
              className="hidden" 
            />
          </div>
          
          <button
            onClick={captureImage}
            disabled={isProcessing}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-3 shadow-lg disabled:opacity-50 hover:bg-primary-lighter hover:bg-opacity-20"
          >
            <Camera className="w-8 h-8 text-primary-lighter" />
          </button>
        </div>

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
            <div className="bg-white bg-opacity-95 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2 text-primary">Résultats</h2>
              <div className="space-y-2 text-sm text-primary-dark">
                <p>
                  <span className="font-medium">Correspondance:</span>{' '}
                  {analysisResults.matchFound ? 
                    <span className="text-green-600">Oui</span> : 
                    <span className="text-red-600">Non</span>
                  }
                </p>
                <p>
                  <span className="font-medium">Confiance:</span>{' '}
                  <span className={`${analysisResults.confidence > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {analysisResults.confidence}%
                  </span>
                </p>
                <p>
                  <span className="font-medium">Motifs:</span>{' '}
                  {analysisResults.detectedPatterns}
                </p>
                <p>
                  <span className="font-medium">Traits communs:</span>{' '}
                  {analysisResults.commonFeatures}
                </p>
                {analysisResults.fileName && (
                  <p className="truncate">
                    <span className="font-medium">Fichier:</span>{' '}
                    {analysisResults.fileName}
                  </p>
                )}
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="bg-white bg-opacity-95 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2 text-primary">Image capturée</h2>
              <img 
                src={capturedImage} 
                alt="Capture"
                className="w-full rounded-lg shadow-md"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectDetectionApp;