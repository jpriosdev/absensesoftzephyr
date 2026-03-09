const sql = require('better-sqlite3');
const db = new sql('public/data/qa-dashboard.db');

const products = db.prepare(
  'SELECT DISTINCT tag0 FROM bugs_detail WHERE tag0 IS NOT NULL AND tag0 != "" ORDER BY tag0'
).all();

console.log('TAG0 values:', products.map(p => p.tag0));
