const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

function createDummyDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
  for (let i = 0; i < 1000; i++) {
    fs.writeFileSync(path.join(dirPath, `file_${i}.txt`), 'dummy content');
  }
}

async function runBenchmark() {
  const syncDir = path.join(__dirname, 'sync_dir');
  const asyncDir = path.join(__dirname, 'async_dir');

  createDummyDir(syncDir);
  createDummyDir(asyncDir);

  console.log('--- Benchmarking Sync ---');
  const startSync = performance.now();
  if (fs.existsSync(syncDir)) {
    fs.rmSync(syncDir, { recursive: true, force: true });
  }
  fs.mkdirSync(syncDir, { recursive: true });
  const endSync = performance.now();
  console.log(`Sync took: ${(endSync - startSync).toFixed(2)}ms (Blocks event loop completely)`);

  console.log('--- Benchmarking Async ---');
  const startAsync = performance.now();
  await fsp.rm(asyncDir, { recursive: true, force: true });
  await fsp.mkdir(asyncDir, { recursive: true });
  const endAsync = performance.now();
  console.log(`Async took: ${(endAsync - startAsync).toFixed(2)}ms (Yields to event loop)`);
}

runBenchmark().catch(console.error);
