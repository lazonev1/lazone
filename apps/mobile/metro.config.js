const { getDefaultConfig } = require('expo/metro-config');
const { resolveSymlinksForMetro } = require('@rnx-kit/metro-resolver-symlinks');

const config = getDefaultConfig(__dirname);
config.resolver.resolveRequest = resolveSymlinksForMetro;

module.exports = config;
//then runn pnpm add -D @rnx-kit/metro-resolver-symlinks --filter ./apps/mobile
