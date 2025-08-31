const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    global: require.resolve("global")
  };
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      global: require.resolve("global")
    })
  ];
  return config;
};
