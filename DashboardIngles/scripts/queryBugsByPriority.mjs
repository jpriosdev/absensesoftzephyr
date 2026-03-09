#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    const dalModule = await import('../lib/database/dal.js');
    const DAL = dalModule.default || dalModule;
    
    console.log('📊 Ejecutando query: SELECT * FROM vw_bugs_by_priority ORDER BY prioridad\n');
    
    const result = await DAL.getBugsByPriority();
    
    console.log('📋 Dataset completo (JSON):');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n\n📊 Dataset en tabla:');
    console.table(result);
    
    console.log(`\n✅ Total de registros: ${result.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
