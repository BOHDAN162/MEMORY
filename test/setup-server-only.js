// A lightweight stub so server-only imports do not throw during Node-based tests.
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(id) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};
