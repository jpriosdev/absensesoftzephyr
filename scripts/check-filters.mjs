import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'public', 'data', 'qa-dashboard.db');
const db = new Database(dbPath, { readonly: true });

console.log('📊 Checking available filter values:\n');

try {
  // Check tag0
  const tag0s = db.prepare("SELECT DISTINCT tag0 FROM bugs_detail WHERE tag0 IS NOT NULL AND tag0 != '' ORDER BY tag0").all();
  console.log(`✅ Products (tag0): ${tag0s.length} values`);
  if (tag0s.length > 0) {
    console.log('   Values:', tag0s.map(r => r.tag0).slice(0, 5).join(', '), tag0s.length > 5 ? '...' : '');
  }

  // Check priorities
  const priorities = db.prepare("SELECT DISTINCT prioridad FROM bugs_detail WHERE prioridad IS NOT NULL AND prioridad != '' ORDER BY prioridad").all();
  console.log(`✅ Priorities: ${priorities.length} values`);
  if (priorities.length > 0) {
    console.log('   Values:', priorities.map(r => r.prioridad).join(', '));
  }

  // Check statuses
  const statuses = db.prepare("SELECT DISTINCT estado FROM bugs_detail WHERE estado IS NOT NULL AND estado != '' ORDER BY estado").all();
  console.log(`✅ Statuses: ${statuses.length} values`);
  if (statuses.length > 0) {
    console.log('   Values:', statuses.map(r => r.estado).slice(0, 5).join(', '), statuses.length > 5 ? '...' : '');
  }

  // Check test types
  const testTypes = db.prepare("SELECT DISTINCT tipo_prueba FROM bugs_detail WHERE tipo_prueba IS NOT NULL AND tipo_prueba != '' ORDER BY tipo_prueba").all();
  console.log(`✅ Test Types: ${testTypes.length} values`);
  if (testTypes.length > 0) {
    console.log('   Values:', testTypes.map(r => r.tipo_prueba).slice(0, 5).join(', '), testTypes.length > 5 ? '...' : '');
  }

  // Check attributes
  const attributes = db.prepare("SELECT DISTINCT atributo FROM bugs_detail WHERE atributo IS NOT NULL AND atributo != '' ORDER BY atributo").all();
  console.log(`✅ Attributes: ${attributes.length} values`);
  if (attributes.length > 0) {
    console.log('   Values:', attributes.map(r => r.atributo).slice(0, 5).join(', '), attributes.length > 5 ? '...' : '');
  }

  // Check test levels
  const testLevels = db.prepare("SELECT DISTINCT nivel_prueba FROM bugs_detail WHERE nivel_prueba IS NOT NULL AND nivel_prueba != '' ORDER BY nivel_prueba").all();
  console.log(`✅ Test Levels: ${testLevels.length} values`);
  if (testLevels.length > 0) {
    console.log('   Values:', testLevels.map(r => r.nivel_prueba).slice(0, 5).join(', '), testLevels.length > 5 ? '...' : '');
  }

  // Check ambientes
  const ambientes = db.prepare("SELECT DISTINCT ambiente FROM bugs_detail WHERE ambiente IS NOT NULL AND ambiente != '' ORDER BY ambiente").all();
  console.log(`✅ Ambientes: ${ambientes.length} values`);
  if (ambientes.length > 0) {
    console.log('   Values:', ambientes.map(r => r.ambiente).slice(0, 5).join(', '), ambientes.length > 5 ? '...' : '');
  }

  // Check total rows
  const total = db.prepare('SELECT COUNT(*) as total FROM bugs_detail').get();
  console.log(`\n📈 Total rows in bugs_detail: ${total.total}`);

} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
