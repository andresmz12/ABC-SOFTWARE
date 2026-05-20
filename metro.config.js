const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub optional native/server-only packages that Metro can't resolve on web
config.resolver = config.resolver ?? {};
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@opentelemetry/api': path.resolve(__dirname, 'shims/opentelemetry.js'),
};

module.exports = withNativeWind(config, { input: './global.css' });
