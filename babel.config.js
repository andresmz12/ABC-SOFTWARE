module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    // react-native-reanimated/plugin is not needed on RN 0.81+ new architecture.
    // react-native-worklets handles worklet compilation natively.
    plugins: [],
  };
};
