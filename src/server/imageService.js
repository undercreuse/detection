const fs = require('fs').promises;
const path = require('path');

async function getSourceImages() {
    try {
        const imagesDir = path.join(__dirname, '../../public/images-source');
        const files = await fs.readdir(imagesDir);
        
        // Filtrer pour ne garder que les images
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png'].includes(ext);
        });

        // Retourner le chemin relatif des images
        return imageFiles.map(file => `/images-source/${file}`);
    } catch (error) {
        console.error('Erreur lors de la lecture du dossier images-source:', error);
        throw error;
    }
}

module.exports = {
    getSourceImages
};
