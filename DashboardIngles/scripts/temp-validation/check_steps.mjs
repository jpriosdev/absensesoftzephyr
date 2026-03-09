#!/usr/bin/env node
// check_steps moved to temp-validation
import fs from 'fs'
import path from 'path'

const dataPath = path.resolve(new URL(import.meta.url).pathname, '../../public/data/qa-data.json')
try {
  const raw = fs.readFileSync(dataPath, 'utf8')
  const data = JSON.parse(raw)
  console.log('Check steps: sprints count', (data.sprintData || []).length)
} catch (e) {
  console.error('Unable to read qa-data.json at', dataPath)
}
import DAL from '../lib/database/dal.js';

(async () => {
  try {
    const total = await DAL.runScalar("SELECT COUNT(*) as total_rows FROM bugs_detail");
    const hasTest = await DAL.runScalar("SELECT COUNT(*) as resumen_has_test FROM bugs_detail WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%'");
    const hasTestNotBug = await DAL.runScalar("SELECT COUNT(*) as resumen_has_test_not_bug FROM bugs_detail WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug'");
    const hasTestNotBugDone = await DAL.runScalar("SELECT COUNT(*) as resumen_has_test_not_bug_done_states FROM bugs_detail WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN ('Done','Approved for Release','Reviewed','Testing Complete')");

    console.log('total_rows', total?.total_rows || 0);
    console.log('resumen_has_test', hasTest?.resumen_has_test || 0);
    console.log('resumen_has_test_not_bug', hasTestNotBug?.resumen_has_test_not_bug || 0);
    console.log('resumen_has_test_not_bug_done_states', hasTestNotBugDone?.resumen_has_test_not_bug_done_states || 0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
