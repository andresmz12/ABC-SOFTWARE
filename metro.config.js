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

// Disable exports-field resolution so Metro always picks CJS builds.
// Zustand and other packages ship ESM builds (containing import.meta) as
// their primary exports entry — disabling this forces Metro to use the
// `main` field (CJS) instead, which has no import.meta.
config.resolver.unstable_enablePackageExports = false;

// Preserve class/function names and disable mangling for packages that
// use names for serialisation or reflection at runtime (e.g. Supabase
// realtime, Zustand middleware).
config.transformer = config.transformer ?? {};
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: false,
};

module.exports = withNativeWind(config, { input: './global.css' });
