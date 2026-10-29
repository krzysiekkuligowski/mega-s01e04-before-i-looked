export type RunStatus = 'ok' | 'retry' | 'fail';

export type StatusCounts = Record<RunStatus, number>;

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  rows: DigestRow[];
  invalidLines: number;
  statusCounts: StatusCounts;
};

export type ReadNight = (runsDir: string, night: string) => NightDigest;
