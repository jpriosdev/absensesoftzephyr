#!/usr/bin/env node
// check_counts moved to temp-validation
import fs from 'fs'
import path from 'path'

try {
  const dataPath = path.resolve(new URL(import.meta.url).pathname, '../../public/data/qa-data.json')
  const raw = fs.readFileSync(dataPath, 'utf8')
  const data = JSON.parse(raw)
  console.log('Counts keys:', Object.keys(data.summary || {}))
} catch (e) {
  console.error('Unable to read qa-data.json at', e.message)
}
import DAL from '../lib/database/dal.js';

(async () => {
  try {
    const all = await DAL.runQuery('SELECT COUNT(*) as total_all FROM bugs_detail');
    const bugs = await DAL.runQuery("SELECT COUNT(*) as total_bug FROM bugs_detail WHERE tipo_incidencia = 'Bug'");
    console.log('Total rows:', all[0].total_all);
    console.log("Total 'Bug':", bugs[0].total_bug);
    const vw = await DAL.runQuery('SELECT * FROM vw_bugs_summary');
    console.log('vw_bugs_summary:', vw[0]);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
