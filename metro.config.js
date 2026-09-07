const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Mirror the "@/*" -> "src/*" alias declared in tsconfig.json so Metro can
// resolve the same imports Babel/TypeScript understand.
config.resolver.extraNodeModules = {
  "@": path.resolve(__dirname, "src"),
};

module.exports = config;
