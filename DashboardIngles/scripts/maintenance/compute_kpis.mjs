import DAL from '../lib/database/dal.js';
import { QADataProcessor } from '../utils/dataProcessor.js';

(async () => {
  try {
    const raw = await DAL.getFullQAData();
    console.log('Data keys:', Object.keys(raw));
    const processed = QADataProcessor.processQAData(raw);
    console.log('Raw summary:');
    console.log(JSON.stringify(raw.summary, null, 2));
    console.log('Sample sprintData (first 3):');
    console.log(JSON.stringify((raw.sprintData||[]).slice(0,3), null, 2));
    console.log('Calculated KPIs:');
    console.log(JSON.stringify(processed.kpis, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error computing KPIs:', e);
    process.exit(1);
  }
})();
