import type { NightDigest } from '../digest/types.js';

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>morning digest</h1>
      <p class="mute">{night}</p>
      {digest.invalidLines > 0 && (
        <p class="warn">
          {digest.invalidLines} {digest.invalidLines === 1 ? 'bad line' : 'bad lines'} skipped
        </p>
      )}
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first time</th>
              <th>last time</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries >= 3 ? <span class="warn">{row.retries}</span> : row.retries}</td>
                <td>{row.lastStatus === 'fail' ? <span class="warn">fail</span> : row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function DigestNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>morning digest</h1>
      <p class="mute">no run log for {night}</p>
    </>
  );
}
