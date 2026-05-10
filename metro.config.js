const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude the relay-server directory — it's a Node.js server, not React Native code.
// Without this, Metro tries to bundle `ws` which imports Node built-ins (stream, etc.)
config.resolver.blockList = [
  new RegExp(path.resolve(__dirname, 'relay-server') + '/.*'),
];

module.exports = config;
