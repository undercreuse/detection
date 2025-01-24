module.exports = {
    webpack: {
      configure: {
        resolve: {
          fallback: {
            path: require.resolve("path-browserify"),
            fs: false,
            crypto: require.resolve("crypto-browserify"),
            stream: require.resolve("stream-browserify"),
            buffer: require.resolve("buffer/")
          }
        }
      }
    }
  };