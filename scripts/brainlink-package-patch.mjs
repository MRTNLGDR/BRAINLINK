import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AFFINE_PACKAGE_BLOB_SHA1 = '35ad088813dc2078137a46795000a60d8e70ddc4';
export const BRAINLINK_BUILD_SCRIPT = 'cross-env PUBLIC_PATH=/ yarn affine web build && node scripts/brainlink-verify-web-build.mjs';

const sha1GitBlob = raw => {
  const normalized = raw.replace(/\r\n/g, '\n');
  const bytes = Buffer.from(normalized, 'utf8');
  return crypto
    .createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
};

const requiredLockValues = {
  devDependencies: {
    '@capacitor/cli': '^7.6.5',
    '@vitest/browser': '^4.1.8',
    '@vitest/coverage-istanbul': '^4.1.8',
    '@vitest/ui': '^4.1.8',
    'cross-env': '^10.1.0',
    oxlint: '1.68.0',
    vitest: '^4.1.8',
  },
  resolutions: {
    '@opentelemetry/core': '^2.8.0',
    '@opentelemetry/resources': '^2.8.0',
    '@opentelemetry/sdk-trace-base': '^2.8.0',
    '@tootallnate/once': '^2.0.1',
    'js-yaml@npm:^4.1.0': '^4.2.0',
    'js-yaml@npm:4.1.1': '^4.2.0',
    tar: '^7.5.16',
  },
};

export const assertLockCompatiblePackage = pkg => {
  if (pkg.name !== '@affine/monorepo' || pkg.version !== '0.27.0') {
    throw new Error(`Unexpected AFFiNE package identity: ${pkg.name}@${pkg.version}`);
  }
  if (pkg.packageManager !== 'yarn@4.13.0') {
    throw new Error(`Unexpected package manager: ${pkg.packageManager}`);
  }
  if (pkg.engines?.node !== '>=22.12.0 <23.0.0') {
    throw new Error(`Unexpected Node engine: ${pkg.engines?.node}`);
  }
  for (const [section, expected] of Object.entries(requiredLockValues)) {
    for (const [name, version] of Object.entries(expected)) {
      if (pkg[section]?.[name] !== version) {
        throw new Error(
          `AFFiNE lock compatibility drift: ${section}.${name} expected ${version}, got ${pkg[section]?.[name]}`
        );
      }
    }
  }
};

export const patchBrainlinkPackage = targetRoot => {
  const packagePath = path.join(path.resolve(targetRoot), 'package.json');
  const raw = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(raw);
  const alreadyPatched = Boolean(pkg.scripts?.['brainlink:validate']);

  if (!alreadyPatched) {
    const actualBlob = sha1GitBlob(raw);
    if (actualBlob !== AFFINE_PACKAGE_BLOB_SHA1) {
      throw new Error(
        `Refusing to patch an unknown AFFiNE package.json. Expected Git blob ${AFFINE_PACKAGE_BLOB_SHA1}, got ${actualBlob}.`
      );
    }
  }

  assertLockCompatiblePackage(pkg);
  pkg.author = 'toeverything + Brainlink contributors';
  pkg.description =
    'Brainlink — local-first operational governance layer built as a compatibility-preserving AFFiNE 0.27.0 fork.';
  pkg.scripts = {
    ...pkg.scripts,
    'brainlink:validate': 'node scripts/brainlink-validate.mjs',
    'brainlink:dev': 'yarn affine web dev',
    'brainlink:build': BRAINLINK_BUILD_SCRIPT,
    'brainlink:test':
      'vitest --run packages/frontend/core/src/brainlink/__tests__',
    'brainlink:check': 'yarn brainlink:validate && yarn brainlink:test',
  };

  assertLockCompatiblePackage(pkg);
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return packagePath;
};

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const targetRoot = process.argv[2] ?? process.cwd();
  const packagePath = patchBrainlinkPackage(targetRoot);
  console.log(`[BRAINLINK] Lock-compatible package metadata patched: ${packagePath}`);
}
