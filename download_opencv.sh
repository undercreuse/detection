#!/bin/bash

# Répertoire de destination
DEST_DIR="/Volumes/_DEV/_UNUM SOLUM/Application reconnaissance/Essai-depuis-detection/detection/public"

# URL de téléchargement d'OpenCV.js
OPENCV_JS_URL="https://docs.opencv.org/4.5.2/opencv.js"

# Créer le répertoire s'il n'existe pas
mkdir -p "$DEST_DIR"

# Télécharger OpenCV.js
echo "Téléchargement de OpenCV.js..."
curl -L "$OPENCV_JS_URL" -o "$DEST_DIR/opencv.js"

# Vérifier le téléchargement
if [ -f "$DEST_DIR/opencv.js" ]; then
    echo "OpenCV.js téléchargé avec succès dans $DEST_DIR"
    ls -l "$DEST_DIR/opencv.js"
else
    echo "Échec du téléchargement de OpenCV.js"
    exit 1
fi
