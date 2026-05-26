const path = require("path");

function resolve(dir) {
  return path.join(__dirname, ".", dir);
}

module.exports = function override(config, env) {
  config.resolve.alias = {
    "@": resolve("src"),
    "charting_library": resolve("public/charting_library"),
  };
  // Drop ModuleScopePlugin so we can import from outside src/.
  config.resolve.plugins = config.resolve.plugins.filter(
    (plugin) => plugin.constructor.name !== "ModuleScopePlugin"
  );
  return config;
};
