import DAL from '../lib/database/dal.js';

(async () => {
  try {
    const views = [
      'vw_bugs_summary',
      'vw_bugs_by_sprint',
      'vw_bugs_by_sprint_status',
      'vw_bugs_by_developer',
      'vw_bugs_by_priority',
      'vw_bugs_by_module',
      'vw_bugs_by_category',
      'vw_developers_analysis'
    ];
    for (const v of views) {
      try {
        await DAL.runQuery(`DROP VIEW IF EXISTS ${v}`);
        console.log(`Dropped view if existed: ${v}`);
      } catch (e) {
        console.warn(`Could not drop view ${v}:`, e.message);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error dropping views:', err);
    process.exit(1);
  }
})();
