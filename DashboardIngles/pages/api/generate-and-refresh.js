import { spawn } from 'child_process';
import path from 'path';
import { getQAData } from '../../lib/qaDataLoader.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const runId = String(Date.now());
    const generatorCwd = path.join(process.cwd(), 'TableroQA');

    const generator = spawn(process.execPath, ['scripts/generateQAJson.js', '--force-v2'], {
      cwd: generatorCwd,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    generator.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    generator.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    const exitCode = await new Promise((resolve) => {
      generator.on('close', (code) => resolve(code));
    });

    // After generator finishes, force QA data reload
    let qaData = null;
    try {
      qaData = await getQAData({ forceReload: true });
    } catch (e) {
      // return generator logs even if reload failed
      console.warn('generate-and-refresh: failed to reload QA data', e && e.message);
    }

    return res.status(200).json({
      ok: true,
      runId,
      exitCode,
      stdout: stdout.split('\n').slice(-20).join('\n'),
      stderr: stderr.split('\n').slice(-20).join('\n'),
      qaData,
    });
  } catch (err) {
    console.error('generate-and-refresh error', err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
