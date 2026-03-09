// SSE endpoint to stream generation logs
import { PassThrough } from 'stream';

if (!global._qa_generate_emitter) {
  const EventEmitter = require('events');
  global._qa_generate_emitter = new EventEmitter();
}

export default function handler(req, res) {
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'id required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const writeEvent = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch (e) {}
  };

  const onLog = ({ runId, msg }) => { if (String(runId) === String(id)) writeEvent({ type: 'log', msg }); };
  const onEnd = ({ runId, code }) => { if (String(runId) === String(id)) { writeEvent({ type: 'end', code }); res.end(); } };

  global._qa_generate_emitter.on('log', onLog);
  global._qa_generate_emitter.on('end', onEnd);

  // Keep connection alive
  const keepAlive = setInterval(() => { try { res.write(': keep-alive\n\n'); } catch (e) {} }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    global._qa_generate_emitter.removeListener('log', onLog);
    global._qa_generate_emitter.removeListener('end', onEnd);
  });
}
