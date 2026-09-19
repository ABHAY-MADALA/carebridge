const path = require("node:path");

// Only R3F's Clock construction is changed. Keep this guard loud on upgrades;
// remove this loader when a stable Fiber version adopts Timer itself.
module.exports = function fiberTimerLoader(source) {
  const pattern = /new THREE(?:__namespace)?\.Clock\(\)/g;
  const matches = source.match(pattern) || [];
  if (matches.length !== 1) throw new Error("Review Fiber Timer compatibility: expected exactly one Clock construction.");
  const adapter = path.resolve(__dirname, "../lib/body/TimerClock.ts");
  return source.replace(pattern, `new (require(${JSON.stringify(adapter)}).TimerClock)()`);
};
