const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase uses .cjs files
config.resolver.sourceExts.push("cjs");

// Disable strict mode for Firebase compatibility
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
