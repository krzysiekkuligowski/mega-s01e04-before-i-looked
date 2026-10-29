import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunStatus, StatusCounts } from './types.js';

type Run = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

type RowState = DigestRow & {
  firstAtMs: number;
  lastAtMs: number;
  lastErrorAtMs: number;
};

const STATUSES = new Set<RunStatus>(['ok', 'retry', 'fail']);

function parseRun(line: string): Run | null {
  try {
    const value: unknown = JSON.parse(line);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

    const record = value as Record<string, unknown>;
    const { at, job, status, owner, error } = record;
    if (
      typeof at !== 'string' ||
      Number.isNaN(Date.parse(at)) ||
      typeof job !== 'string' ||
      job.length === 0 ||
      typeof status !== 'string' ||
      !STATUSES.has(status as RunStatus) ||
      (typeof owner !== 'string' && owner !== null) ||
      (error !== undefined && typeof error !== 'string')
    ) {
      return null;
    }

    return { at, job, status: status as RunStatus, owner, ...(error === undefined ? {} : { error }) };
  } catch {
    return null;
  }
}

function addRun(rows: Map<string, RowState>, run: Run): void {
  const atMs = Date.parse(run.at);
  const existing = rows.get(run.job);

  if (!existing) {
    rows.set(run.job, {
      job: run.job,
      owner: run.owner,
      runs: 1,
      retries: run.status === 'retry' ? 1 : 0,
      lastStatus: run.status,
      lastError: run.error ?? null,
      firstAt: run.at,
      lastAt: run.at,
      firstAtMs: atMs,
      lastAtMs: atMs,
      lastErrorAtMs: run.error === undefined ? Number.NEGATIVE_INFINITY : atMs,
    });
    return;
  }

  existing.runs += 1;
  if (run.status === 'retry') existing.retries += 1;

  if (atMs < existing.firstAtMs) {
    existing.firstAtMs = atMs;
    existing.firstAt = run.at;
  }

  if (atMs >= existing.lastAtMs) {
    existing.lastAtMs = atMs;
    existing.lastAt = run.at;
    existing.lastStatus = run.status;
    existing.owner = run.owner;
  }

  if (run.error !== undefined && atMs >= existing.lastErrorAtMs) {
    existing.lastErrorAtMs = atMs;
    existing.lastError = run.error;
  }
}

export const readNight: ReadNight = (runsDir, night): NightDigest => {
  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const rows = new Map<string, RowState>();
  const statusCounts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  let invalidLines = 0;

  for (const line of contents.split(/\r?\n/)) {
    if (line.trim() === '') continue;

    const run = parseRun(line);
    if (!run) {
      invalidLines += 1;
      continue;
    }

    statusCounts[run.status] += 1;
    addRun(rows, run);
  }

  return {
    rows: [...rows.values()]
      .sort((left, right) => left.job.localeCompare(right.job))
      .map(({ firstAtMs: _firstAtMs, lastAtMs: _lastAtMs, lastErrorAtMs: _lastErrorAtMs, ...row }) => row),
    invalidLines,
    statusCounts,
  };
};
