import { spawnSync, SpawnSyncReturns } from 'child_process';
import { existsSync } from 'fs';

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

// Only call process.exit when run directly; this allows us to import the module in tests
// without terminating the test runner.
if (require.main === module) {
  process.exit(runPlaywright());
}
