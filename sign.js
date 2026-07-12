/**
 * Custom no-op sign script for cross-platform builds on Linux.
 * Skips Windows code signing (which requires Wine/signtool).
 * Replace with a real signing implementation for production distribution.
 */
exports.default = async function sign(configuration) {
  console.log(`[sign] Skipping code signing for: ${configuration.path}`);
};
