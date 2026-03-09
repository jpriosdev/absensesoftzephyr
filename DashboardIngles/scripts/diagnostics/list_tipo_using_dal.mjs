import DAL from '../lib/database/dal.js';

(async () => {
  try {
    const rows = await DAL.runQuery('SELECT tipo_incidencia, COUNT(*) as cnt FROM bugs_detail GROUP BY tipo_incidencia ORDER BY cnt DESC');
    console.log('Distinct tipo_incidencia counts:');
    rows.forEach(r => console.log(`${r.tipo_incidencia || 'NULL'}: ${r.cnt}`));
    process.exit(0);
  } catch (err) {
    console.error('Error querying via DAL:', err);
    process.exit(1);
  }
})();
import DAL from '../lib/database/dal.js';

(async () => {
  try {
    const rows = await DAL.runQuery('SELECT tipo_incidencia, COUNT(*) as cnt FROM bugs_detail GROUP BY tipo_incidencia ORDER BY cnt DESC');
    console.log('Distinct tipo_incidencia counts:');
    rows.forEach(r => console.log(`${r.tipo_incidencia || 'NULL'}: ${r.cnt}`));
    process.exit(0);
  } catch (err) {
    console.error('Error querying via DAL:', err);
    process.exit(1);
  }
})();
