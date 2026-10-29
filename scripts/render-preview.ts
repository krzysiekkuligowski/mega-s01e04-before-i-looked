import { createApp } from '../src/app.js';

const response = await createApp().request('http://rig.local/digest/2026-10-28');

if (!response.ok) {
  throw new Error(`Could not render the digest preview: ${response.status}`);
}

process.stdout.write(await response.text());
