import { spawnSync } from 'child_process';
import { existsSync } from 'fs';

const args = process.argv.slice(2);
const PLAYWRIGHT_TAG = '';

const isArch = process.platform === 'linux' && existsSync('/etc/arch-release');

if (isArch) {
  console.info('Arch Linux detected — running Playwright inside Podman');

  const result = spawnSync(
    'podman',
    [
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
    ],
    { stdio: 'inherit' },
  );

  process.exit(result.status ?? 1);
} else {
  console.info('Running Playwright locally');

  const result = spawnSync('npx', ['playwright', 'test', ...args], { stdio: 'inherit' });

  process.exit(result.status ?? 1);
}
