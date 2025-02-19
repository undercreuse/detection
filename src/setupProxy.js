const express = require('express');
const serveIndex = require('serve-index');

module.exports = function(app) {
    // Servir les fichiers statiques et l'index du dossier
    app.use('/images-source', 
        express.static('public/images-source'),
        serveIndex('public/images-source', {'icons': true})
    );
};
