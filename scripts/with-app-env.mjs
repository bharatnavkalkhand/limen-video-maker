#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(__dirname, '..');

async function loadAppEnv() {
  try {
    const envPath = join(workspaceRoot, '.grok', 'app-env.json');
    const content = await readFile(envPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // No app-env.json or .grok directory - return defaults
    return { VITE_AUTH_ENABLED: 'false' };
  }
}

async function main() {
  const appEnv = await loadAppEnv();
  const [_node, _script, ...args] = process.argv;

  const child = spawn(args[0], args.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...appEnv,
    },
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('with-app-env.mjs failed:', err);
  process.exit(1);
});
