const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;
// Combine both configurations
module.exports = wrapWithReanimatedMetroConfig(
  withNativeWind(config, { input: "./app/globals.css" })
);
