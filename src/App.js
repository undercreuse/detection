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
  const [patternService, setPatternService] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // URL actuelle de l'application
  const appUrl = window.location.href.replace('localhost', window.location.hostname);

  useEffect(() => {
    const service = new PatternDetectionService();
    
    const checkServiceReady = () => {
      if (service.isReady) {
        setPatternService(service);
        setIsLoading(false);
      } else {
        setTimeout(checkServiceReady, 500);
      }
    };

    checkServiceReady();
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
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
    if (!patternService) {
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
      const results = await patternService.detectPattern(imageData);
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

  const handleComparison = async () => {
    console.log("Démarrage de la comparaison d'images");
    console.log("Image capturée :", capturedImage ? capturedImage.substring(0, 50) + '...' : 'Pas d\'image');
    
    if (capturedImage) {
      try {
        console.log("Appel de PatternDetectionService.compareImages()");
        const comparisons = await patternService.compareImages(capturedImage);
        console.log("Comparaisons reçues :", comparisons);
        
        setComparisonData(comparisons);
        setShowComparison(true);
      } catch (error) {
        console.error("Erreur lors de la comparaison :", error);
        alert('Erreur lors de la comparaison des images : ' + error.message);
      }
    } else {
      console.warn("Pas d'image capturée");
      alert('Veuillez d\'abord capturer une image');
    }
  };

  const testImageComparison = async () => {
    if (!patternService) {
      setError('Service de détection non initialisé');
      return;
    }

    try {
      setIsLoading(true);
      // Charger une image de test
      const testImageResponse = await fetch('/images-source/unum1.png');
      const testImageBlob = await testImageResponse.blob();
      const testImageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(testImageBlob);
      });

      // Comparer avec une autre image source
      const result = await patternService.compareImagePair(
        '/images-source/unum2.png', 
        testImageDataUrl
      );

      console.log('Résultat de la comparaison :', result);
      setComparisonResult(result);
      setError(null);
    } catch (error) {
      console.error('Erreur lors de la comparaison :', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* En-tête avec logo et boutons */}
        <div className="p-4 bg-primary-light flex justify-between items-center">
          <div className="h-12 flex items-center">
            <img 
              src={logo} 
              alt="Logo Unum SOlum"
              className="h-full w-auto object-contain"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={captureImage}
              disabled={isProcessing || !patternService}
              className="ml-2 p-2 rounded-full bg-primary-lighter hover:bg-white"
            >
              {isProcessing ? (
                <Scan className="w-8 h-8 animate-spin" />
              ) : !patternService ? (
                <div className="flex items-center space-x-2">
                  <Scan className="w-8 h-8 animate-pulse" />
                </div>
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </button>
            {capturedImage && (
              <button
                onClick={handleComparison}
                className="ml-2 p-2 rounded-full bg-primary-lighter hover:bg-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white hover:text-primary-lighter">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M11 12 L13 14 L16 11"/>
                </svg>
              </button>
            )}
            <button
              onClick={toggleQR}
              className="ml-2 p-2 rounded-full bg-primary-lighter hover:bg-white"
            >
              <QrCode className="w-6 h-6 text-white hover:text-primary-lighter" />
            </button>
            <button
              onClick={testImageComparison}
              className="ml-2 p-2 rounded-full bg-primary-lighter hover:bg-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white hover:text-primary-lighter">
                <path d="M12 10v6m0 0l-3-3m3 3l3-3m-3 3H9m0 0a9 9 0 110-18 9 9 0 010 18z"/>
              </svg>
            </button>
          </div>
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
            disabled={isProcessing || !patternService}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-full bg-primary-lighter text-white hover:bg-white hover:text-primary-lighter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Scan className="w-8 h-8 animate-spin" />
            ) : !patternService ? (
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
          {isLoading && (
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

        {/* Modal Comparaison d'Images */}
        {showComparison && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
               onClick={() => setShowComparison(false)}>
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full relative" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setShowComparison(false)} 
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h2 className="text-xl font-bold mb-4">Comparaison d'Images</h2>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Image Source</th>
                    <th className="border p-2">Image Capturée</th>
                    <th className="border p-2">Image Comparée</th>
                    <th className="border p-2">Informations de Comparaison</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.length > 0 ? (
                    comparisonData.map((item, index) => {
                      // Extraire le nom du fichier de manière sécurisée
                      const sourceImageName = typeof item.sourceImage === 'string' 
                        ? item.sourceImage.split('/').pop() 
                        : `unum${index + 1}.png`;

                      return (
                        <tr key={index}>
                          <td className="border p-2 text-center">
                            <img 
                              src={`/images-source/${sourceImageName}`} 
                              alt="Source" 
                              className="mx-auto max-h-32 max-w-full object-contain"
                            />
                          </td>
                          <td className="border p-2 text-center">
                            {item.capturedImage && (
                              <img 
                                src={item.capturedImage} 
                                alt="Capturée" 
                                className="mx-auto max-h-32 max-w-full object-contain"
                              />
                            )}
                          </td>
                          <td className="border p-2 text-center">
                            {item.comparisonImageDataUrl && (
                              <img 
                                src={item.comparisonImageDataUrl} 
                                alt="Comparaison" 
                                className="mx-auto max-h-32 max-w-full object-contain"
                              />
                            )}
                          </td>
                          <td className="border p-2 text-center">
                            {item.comparisonInfo}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="border p-2 text-center">Aucune comparaison trouvée</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Modal QR Code */}
        {showQR && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
               onClick={toggleQR}>
            <div className="bg-white p-6 rounded-lg relative" onClick={e => e.stopPropagation()}>
              <button 
                onClick={toggleQR} 
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
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