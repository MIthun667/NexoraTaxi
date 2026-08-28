process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_SKIP_PROJECT = 'true';
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  target: 'es2022',
  esModuleInterop: true,
});

console.log('seed-runner: starting');
require('ts-node/register/transpile-only');
console.log('seed-runner: ts-node registered');
require('./seed.ts');
