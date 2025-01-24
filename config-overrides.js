module.exports = function override(config, env) {
  // Ajouter les fallbacks pour les modules Node.js
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: require.resolve('path-browserify'),
    stream: false,
    crypto: false,
  };

  return config;
};
