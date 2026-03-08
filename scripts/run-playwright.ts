/* eslint-env node */

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// promisified helper exported independently so tests can stub or spy on it
export function invoke(command: string, commandArgs: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child: ChildProcess = spawn(command, commandArgs, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    const forward = (signal: number) => {
      if (child && !child.killed) {
        child.kill(signal);
      }
    };

    process.on('SIGINT', forward);
    process.on('SIGTERM', forward);

    child.on('exit', (code) => {
      process.off('SIGINT', forward);
      process.off('SIGTERM', forward);
      resolve(code ?? 1);
    });
  });
}

/**
 * Executes the logic that would normally be run when the script is invoked from the
 * command line.  Returning an exit code instead of calling `process.exit` makes the
 * behaviour testable.  The implementation uses async/await so that the caller can
 * await completion and we can properly forward signals from Node -> Podman -> container.
 */
export async function runPlaywright(args: string[] = process.argv.slice(2)): Promise<number> {
  const PLAYWRIGHT_TAG = '';
  const isArch = process.platform === 'linux' && existsSync('/etc/arch-release');

  if (isArch) {
    console.info('Arch Linux detected — running Playwright inside Podman');

    const result = await invoke('podman', [
      'run',
      '--rm',
      '--init',
      '-t',
      '-v',
      `${process.cwd()}:/work`,
      '-w',
      '/work',
      `mcr.microsoft.com/playwright:${PLAYWRIGHT_TAG || 'v1.58.2-noble'}`,
      'npx',
      'playwright',
      'test',
      ...args,
    ]);

    return result;
  } else {
    console.info('Running Playwright locally');
    const result = await invoke('npx', ['playwright', 'test', ...args]);
    return result;
  }
}

// In ESM context there is no `require`; instead detect whether this file
// is the entry point by comparing the current file URL with the first argument
// passed to Node.js.  `tsx` sets `process.argv[1]` to the compiled script path.
//
// Keeping the check lets us import/run this module in tests without invoking
// `process.exit` unexpectedly.
const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] === scriptPath) {
  void runPlaywright().then((code) => process.exit(code));
}
