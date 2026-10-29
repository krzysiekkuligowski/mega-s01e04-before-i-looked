import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const configFor = (runsDir: string) => ({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
});

const runLog = [
  '{"at":"2026-10-29T01:00:00+01:00","job":"zeta","status":"retry","owner":"rook","error":"locked"}',
  '{"at":"2026-10-29T01:01:00+01:00","job":"alpha","status":"ok","owner":null}',
  'not json',
  '{"at":"2026-10-29T01:02:00+01:00","job":"zeta","status":"ok","owner":"rook"}',
].join('\n');

describe('digest routes', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  const temporaryRuns = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    dirs.push(dir);
    return dir;
  };

  it('renders sorted HTML rows and matching JSON for a night with a bad line', async () => {
    const runsDir = temporaryRuns();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), runLog);
    const app = createApp(configFor(runsDir));

    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    const api = await app.request('/api/digest/2026-10-28');
    const rows = (await api.json()) as DigestRow[];

    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    expect(html).toContain('1 bad line skipped');
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('zeta'));
    expect(rows.map((row) => row.job)).toEqual(['alpha', 'zeta']);
    expect(rows.find((row) => row.job === 'zeta')).toMatchObject({ retries: 1, lastStatus: 'ok', lastError: 'locked' });
  });

  it('returns 404 for a night without a log', async () => {
    const app = createApp(configFor(temporaryRuns()));

    expect((await app.request('/digest/2026-10-28')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-28')).status).toBe(404);
  });

  it('renders an empty night and returns an empty JSON array', async () => {
    const runsDir = temporaryRuns();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');
    const app = createApp(configFor(runsDir));

    const page = await app.request('/digest/2026-10-28');
    const api = await app.request('/api/digest/2026-10-28');

    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect(api.status).toBe(200);
    expect(await api.json()).toEqual([]);
  });
});
