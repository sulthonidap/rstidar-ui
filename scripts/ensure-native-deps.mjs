// Docker build guard: npm sometimes skips platform-specific optional deps
// (https://github.com/npm/cli/issues/4828), e.g. rolldown's native binding,
// and `vite build` then fails with "Cannot find native binding". This installs
// every optional package from the lockfile that matches this OS/CPU but is
// missing from node_modules, at the exact locked version.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const glibc = !!process.report?.getReport().header.glibcVersionRuntime;
const fits = (list, value) => !list || list.includes(value);

const missing = Object.entries(lock.packages)
  .filter(([path, p]) => path && p.optional && p.version)
  .filter(([, p]) => fits(p.os, process.platform) && fits(p.cpu, process.arch))
  .filter(([, p]) => fits(p.libc, glibc ? 'glibc' : 'musl'))
  .filter(([path]) => !existsSync(path))
  .map(([path, p]) => `${path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length)}@${p.version}`);

if (missing.length === 0) {
  console.log('native deps: lengkap');
} else {
  console.log(`native deps: memasang yang terlewat → ${missing.join(', ')}`);
  execFileSync('npm', ['install', '--no-save', '--no-audit', '--no-fund', ...missing], {
    stdio: 'inherit',
    shell: process.platform === 'win32', // npm is npm.cmd there
  });
}
