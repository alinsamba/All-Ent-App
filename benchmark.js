const fs = require('fs');

const loadedExts = Array.from({ length: 50 }, (_, i) => ({ id: `ext_${i}` }));
const pinnedExtensions = [];

async function getExtensionMetadata(ext) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ popupPath: `popup_${ext.id}.html` });
    }, 10); // simulate 10ms delay
  });
}

async function runSequential() {
  const start = Date.now();
  for (const ext of loadedExts) {
    const metadata = await getExtensionMetadata(ext);
    const popupPath = metadata.popupPath;
  }
  const end = Date.now();
  return end - start;
}

async function runConcurrent() {
  const start = Date.now();
  const extsWithMetadata = await Promise.all(
    loadedExts.map(async (ext) => {
      const metadata = await getExtensionMetadata(ext);
      return { ext, metadata };
    })
  );
  for (const { ext, metadata } of extsWithMetadata) {
    const popupPath = metadata.popupPath;
  }
  const end = Date.now();
  return end - start;
}

async function main() {
  console.log('Running benchmark...');
  const seqTime = await runSequential();
  console.log(`Sequential: ${seqTime}ms`);
  const conTime = await runConcurrent();
  console.log(`Concurrent: ${conTime}ms`);
}
main();
