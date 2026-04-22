// Babel config for Expo SDK 55. The expo preset handles RN + JSX + TS out of the box.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"]
  };
};
