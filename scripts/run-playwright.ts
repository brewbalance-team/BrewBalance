import { spawnSync, SpawnSyncReturns } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

/**
 * Executes the logic that would normally be run when the script is invoked from the
 * command line.  Returning an exit code instead of calling `process.exit` makes the
 * behaviour testable.
 */
export function runPlaywright(args: string[] = process.argv.slice(2)): number {
  const PLAYWRIGHT_TAG = '';
  const isArch = process.platform === 'linux' && existsSync('/etc/arch-release');

  const invoke = (command: string, commandArgs: string[]): SpawnSyncReturns<Buffer> => {
    return spawnSync(command, commandArgs, { stdio: 'inherit', shell: true });
  };

  if (isArch) {
    console.info('Arch Linux detected — running Playwright inside Podman');

    const result = invoke('podman', [
      'run',
      '--rm',
      '-t',
      '-v',
      `${process.cwd()}:/work`,
      '-w',
      '/work',
      `mcr.microsoft.com/playwright:${PLAYWRIGHT_TAG || 'v1.58.2-noble'}`,
      'bash',
      '-lc',
      `npx playwright test ${args.join(' ')}`,
    ]);

    if (result.error) {
      console.error('podman execution failed:', result.error.message);
      return 1;
    }

    return result.status ?? 1;
  } else {
    console.info('Running Playwright locally');

    // On Windows the executable is actually `npx.cmd` so shell:true allows us to invoke
    // the command name generically and still have the shell resolve the correct file.
    const result = invoke('npx', ['playwright', 'test', ...args]);

    if (result.error) {
      console.error('npx execution failed:', result.error.message);
      return 1;
    }

    return result.status ?? 1;
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
  process.exit(runPlaywright());
}
