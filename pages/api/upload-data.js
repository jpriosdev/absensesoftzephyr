import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Simple in-memory pub/sub to stream logs to SSE endpoint
if (!global._qa_generate_emitter) {
  const EventEmitter = require('events');
  global._qa_generate_emitter = new EventEmitter();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { filename, contentBase64, originalFilename, saveOriginal } = req.body || {};
    if (!filename || !contentBase64) return res.status(400).json({ error: 'filename and contentBase64 required' });

    // Ensure we write into TableroQA/data so the generator finds the file
    const appDataDir = path.join(process.cwd(), 'TableroQA', 'data');
    if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
    const targetPath = path.join(appDataDir, filename);
    const buffer = Buffer.from(contentBase64, 'base64');
    fs.writeFileSync(targetPath, buffer);

    // Optionally also save a copy with the original filename for records
    if (saveOriginal && originalFilename) {
      const originalPath = path.join(appDataDir, originalFilename);
      try {
        fs.writeFileSync(originalPath, buffer);
      } catch (e) {
        // continue; don't fail the whole request if saving copy fails
        console.warn('Failed to save original copy', e.message || e);
      }
    }

    const runId = String(Date.now());

    // Spawn generator script
    // Run the generator from the TableroQA folder so it uses the correct scripts and data path
    const generatorCwd = path.join(process.cwd(), 'TableroQA');
    const generator = spawn(process.execPath, ['scripts/generateQAJson.js'], { cwd: generatorCwd, env: process.env });

    generator.stdout.on('data', (chunk) => {
      const msg = chunk.toString();
      global._qa_generate_emitter.emit('log', { runId, msg });
    });

    generator.stderr.on('data', (chunk) => {
      const msg = chunk.toString();
      global._qa_generate_emitter.emit('log', { runId, msg });
    });

    generator.on('close', (code) => {
      global._qa_generate_emitter.emit('end', { runId, code });
    });

    return res.status(200).json({ ok: true, runId });
  } catch (err) {
    console.error('upload-data error', err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
