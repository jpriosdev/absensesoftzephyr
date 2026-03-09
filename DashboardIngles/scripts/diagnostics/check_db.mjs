import DAL from '../lib/database/dal.js';

async function run() {
  try {
    const stats = await DAL.getStatistics();
    const totalBugs = stats?.total_bugs ?? 'N/A';
    const totalSprints = stats?.total_sprints ?? 'N/A';
    console.log('DB Statistics:');
    console.log(' total_bugs =>', totalBugs);
    console.log(' total_sprints =>', totalSprints);

    const sprints = await DAL.getAllSprints();
    console.log('Sprints count (via getAllSprints):', Array.isArray(sprints) ? sprints.length : 'N/A');

    const summary = await DAL.getBugsSummary();
    console.log('Bugs summary rows:', Array.isArray(summary) ? summary : summary);
    process.exit(0);
  } catch (e) {
    console.error('Error checking DB:', e.message);
    process.exit(2);
  }
}

run();
