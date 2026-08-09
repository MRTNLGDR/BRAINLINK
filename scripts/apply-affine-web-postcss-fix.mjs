import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const POSTCSS_FILE = path.join('tools', 'cli', 'src', 'rspack', 'index.ts');

const ORIGINAL = `                {
                  loader: 'postcss-loader',
                  options: {
                    postcssOptions: {
                      plugins: hasTailwind
                        ? [
                            tailwindPlugin,
                            ['autoprefixer'],
                            ...(buildConfig.isAdmin
                              ? [queuedashScopePostcssPlugin()]
                              : []),
                          ]
                        : [
                            cssnano({
                              preset: ['default', { convertValues: false }],
                            }),
                          ],
                    },
                  },
                },`;

const PATCHED = `                ...(hasTailwind
                  ? [
                      {
                        loader: 'postcss-loader',
                        options: {
                          postcssOptions: {
                            plugins: [
                              tailwindPlugin,
                              ['autoprefixer'],
                              ...(buildConfig.isAdmin
                                ? [queuedashScopePostcssPlugin()]
                                : []),
                            ],
                          },
                        },
                      },
                    ]
                  : []),`;

export const applyAffineWebPostcssFix = targetRoot => {
  const file = path.join(path.resolve(targetRoot), POSTCSS_FILE);
  const source = fs.readFileSync(file, 'utf8');

  if (source.includes(PATCHED)) {
    return file;
  }

  const occurrences = source.split(ORIGINAL).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `AFFiNE web PostCSS anchor expected exactly once, found ${occurrences}.`
    );
  }

  fs.writeFileSync(file, source.replace(ORIGINAL, PATCHED), 'utf8');
  console.log('[BRAINLINK] Applied AFFiNE web PostCSS compatibility fix.');
  return file;
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  applyAffineWebPostcssFix(process.argv[2] ?? process.cwd());
}
