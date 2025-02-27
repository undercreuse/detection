import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, QrCode } from 'lucide-react';
import logo from './logo.png';
import { QRCodeCanvas } from 'qrcode.react';
import PatternDetectionService from './services/PatternDetectionService';

// Correspondance entre les numéros et les codes de porte-clefs
const keyChainCodes = {
  '1': '65N8S9Q2LC',
  '2': '5U5317B3IJ',
  '3': 'B69JTMHHEV',
  '4': 'V4DHWQK4L9',
  '78': 'SUQBNEXFHN',
  '79': 'DWZPPMZHB5',
  '80': 'BQ013HQ53O',
  '81': 'QMI3TTWDZJ',
  '82': 'CJ8LXNNLHH',
  '83': 'PWIYVVCBFI',
  '84': 'OVK46SNAJF',
  '85': 'X9LI5EUVVY',
  '86': '4DO3JYO4P4',
  '87': 'H06H985SXQ',
  '88': 'FXW4NBSBNQ'
};

// URL de l'application pour le QR code
const appUrl = window.location.href;

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
  const [showResults, setShowResults] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [comparisonConfidence, setComparisonConfidence] = useState(null);
  const [nftDetails, setNftDetails] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraSound = new Audio(process.env.PUBLIC_URL + '/clic2.mp3');

  useEffect(() => {
    // Précharger le son et gérer les erreurs
    cameraSound.onerror = (error) => {
      console.warn('Erreur de chargement du son de l\'appareil photo', error);
    };
  }, []);

  const playCameraSound = () => {
    try {
      cameraSound.currentTime = 0; // Réinitialiser la lecture
      cameraSound.play().catch(error => {
        console.warn('Impossible de jouer le son de l\'appareil photo', error);
      });
    } catch (error) {
      console.warn('Erreur lors de la lecture du son', error);
    }
  };

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



  const captureImage = async () => {
    try {
      if (!patternService) {
        console.warn("Le service de détection n'est pas encore prêt");
        return;
      }

      // Jouer le son de l'appareil photo
      try {
        cameraSound.currentTime = 0;
        await cameraSound.play();
      } catch (error) {
        console.warn('Erreur lors de la lecture du son:', error);
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
    } catch (error) {
      console.error('Erreur lors de la prise de photo', error);
    }
  };

  const processImage = async (imageData) => {
    setIsProcessing(true);
    try {
      const results = await patternService.detectPattern(imageData);
      console.log("Résultats de la détection:", results);
      
      if (results && results.matchFound && results.confidence > 50) {
        const sourceImageName = results.fileName.split('/').pop();
        console.log("Image détectée:", sourceImageName);

        // Extraire le numéro du fichier pour le code du porte-clef
        const fileNumber = sourceImageName.match(/\d+/)[0];
        console.log("Numéro extrait du fichier:", fileNumber);

        // Récupérer le code du porte-clef
        const keyChainCode = keyChainCodes[fileNumber];
        console.log("Code du porte-clef trouvé:", keyChainCode, "pour le fichier numéro:", fileNumber);

        if (!keyChainCode) {
          console.error("Pas de code trouvé pour le numéro:", fileNumber);
          console.log("Codes disponibles:", Object.keys(keyChainCodes));
        }

        // Créer l'URL du porte-clef
        const porteClefUrl = `https://mon-porte-clef.unum-solum.com/${keyChainCode || '65N8S9Q2LC'}`;
        console.log("URL du porte-clef:", porteClefUrl);

        // Mettre à jour les résultats
        setAnalysisResults({
          ...results,
          sourceImageName,
          keyChainCode,
          porteClefUrl
        });

        // Ouvrir automatiquement la page du porte-clef
        try {
          const newWindow = window.open(porteClefUrl, '_blank');
          if (newWindow) {
            console.log("Nouvelle fenêtre ouverte avec succès");
          } else {
            console.warn("Le bloqueur de popups a peut-être bloqué l'ouverture de la fenêtre");
          }
        } catch (error) {
          console.error("Erreur lors de l'ouverture de la fenêtre:", error);
        }
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

  const viewNFT = () => {
    if (nftDetails) {
      window.open(nftDetails.url, '_blank');
    }
  };

  // Calculer les dimensions du rectangle de cadrage
  const getCropGuideStyle = () => {
    if (!videoSize.width || !videoSize.height) return {};

    // Dimensions basées sur la hauteur pour un ratio plus compact
    const captureWidth = videoSize.height * 0.267; // Largeur réelle de capture
    
    // Viseur plus large mais moins haut que la zone de capture
    const displayWidth = captureWidth * 2.5; // Multiplier la largeur du viseur par 2.5
    const displayHeight = displayWidth * 1.2; // Ratio 1:1.2 (légèrement plus haut que large)
    
    // Centrer le viseur
    const left = (videoSize.width - displayWidth) / 2;
    const top = (videoSize.height - displayHeight) / 2;

    return {
      left: `${(left / videoSize.width) * 100}%`,
      top: `${(top / videoSize.height) * 100}%`,
      width: `${(displayWidth / videoSize.width) * 100}%`,
      height: `${(displayHeight / videoSize.height) * 100}%`
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
          </div>
        </div>

        {/* Zone de la caméra */}
        <div className="relative flex-[5] bg-black">
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
            onClick={() => {
              const clickSound = new Audio('/clic2.mp3');
              clickSound.play().catch(e => console.log('Erreur audio:', e));
              captureImage();
            }}
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

        {/* Zone principale */}
        <div className="h-16 bg-primary-light p-4 overflow-y-auto">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-white text-center">
                <p>Initialisation du service de détection...</p>
                <div className="mt-2">
                  <Scan className="w-6 h-6 animate-spin mx-auto" />
                </div>
              </div>
            ) : analysisResults && analysisResults.matchFound ? (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowResults(true)}
                  className="bg-primary-darker hover:bg-primary text-white font-bold py-2 px-4 rounded-lg"
                >
                  Voir le résultat
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Résultats de la détection */}
        {analysisResults && analysisResults.matchFound && (
          <div className="fixed bottom-0 left-0 right-0 bg-primary-light p-4 text-white text-center z-50">
            <p className="text-lg font-bold mb-2">{analysisResults.sourceImageName}</p>
            <button 
              onClick={() => {
                const url = analysisResults.porteClefUrl || `https://mon-porte-clef.unum-solum.com/${analysisResults.keyChainCode || '65N8S9Q2LC'}`;
                console.log("Ouverture du porte-clef via le bouton:", url);
                window.open(url, '_blank');
              }}
              className="bg-primary-darker hover:bg-primary text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Voir le porte-clef
            </button>
          </div>
        )}
        
        {/* Modal Résultats */}
        {showResults && analysisResults && analysisResults.matchFound && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg relative w-full max-w-md">
              <button 
                onClick={() => setShowResults(false)} 
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg text-primary">Motif détecté !</h3>
                <p className="text-sm text-gray-600">{analysisResults.sourceImageName}</p>
              </div>
              {(() => {
                // Extraire le numéro du nom du fichier
                const fileNumber = analysisResults.sourceImageName.replace(/[^0-9]/g, '');
                const keyChainCode = keyChainCodes[fileNumber];
                
                if (keyChainCode) {
                  return (
                    <a 
                      href={`https://mon-porte-clef.unum-solum.com/${keyChainCode}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-primary-darker hover:bg-primary text-white font-bold py-3 px-6 rounded-lg w-full text-center block"
                    >
                      Voir le porte-clef {fileNumber}
                    </a>
                  );
                } else {
                  return (
                    <p className="text-red-500 text-center">Code non trouvé pour l'image {fileNumber}</p>
                  );
                }
              })()}
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