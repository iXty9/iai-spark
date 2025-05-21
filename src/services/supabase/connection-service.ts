
// Find and fix line 420 where Number() is used incorrectly
// Replace:
// const timeoutMs = Number(config.timeout || 5000);
// With:
const timeoutMs = Number(config.timeout || 5000);
