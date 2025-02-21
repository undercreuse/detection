const express = require('express');
const serveIndex = require('serve-index');
const { getSourceImages } = require('./server/imageService');

module.exports = function(app) {
    // Servir les fichiers statiques et l'index du dossier
    app.use('/images-source', 
        express.static('public/images-source'),
        serveIndex('public/images-source', {'icons': true})
    );

    // Endpoint pour lister les images
    app.get('/api/images', async (req, res) => {
        try {
            const images = await getSourceImages();
            res.json(images);
        } catch (error) {
            console.error('Erreur lors de la récupération des images:', error);
            res.status(500).json({ error: 'Erreur lors de la récupération des images' });
        }
    });
};
