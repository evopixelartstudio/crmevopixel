import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

let publicAssets: Promise<Set<string>> | undefined;

async function loginAssets(): Promise<Set<string>> {
  const [app, build] = await Promise.all([
    readFile(path.join(process.cwd(), '.next', 'app-build-manifest.json'), 'utf8'),
    readFile(path.join(process.cwd(), '.next', 'build-manifest.json'), 'utf8'),
  ]);
  const pages = JSON.parse(app).pages as Record<string, string[]>;
  const framework = JSON.parse(build) as { polyfillFiles?: string[]; rootMainFiles?: string[] };
  return new Set([
    ...(pages['/layout'] || []),
    ...(pages['/login/page'] || []),
    ...(pages['/_not-found/page'] || []),
    ...(framework.polyfillFiles || []),
    ...(framework.rootMainFiles || []),
  ].map(file => `/_next/${file}`));
}

export async function isPublicAsset(pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/_next/static/')) return false;
  if (/\.(?:css|woff2?|ttf|otf)$/.test(pathname)) return true;
  if (process.env.NODE_ENV !== 'production') {
    return ['/webpack.js', '/main-app.js', '/app-pages-internals.js', '/polyfills.js', '/app/layout.js', '/app/login/page.js']
      .some(file => pathname === `/_next/static/chunks${file}`);
  }
  try {
    publicAssets ??= loginAssets();
    return (await publicAssets).has(pathname);
  } catch { return false; }
}
