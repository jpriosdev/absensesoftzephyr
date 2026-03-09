import DAL from '../lib/database/dal.js';

const DONE_STATES = ['Done','Approved for Release','Reviewed','Testing Complete'];

(async () => {
  try {
    const total = await DAL.runScalar("SELECT COUNT(*) as total_rows FROM bugs_detail");
    const aRows = await DAL.runQuery(`SELECT id, sprint, estado, tipo_incidencia, resumen FROM bugs_detail WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN (${DONE_STATES.map(s=>"'"+s+"'").join(',')})`);
    const countA = aRows.length;

    const sprintsView = await DAL.runQuery("SELECT sprint FROM vw_bugs_by_sprint");
    const sprintSet = new Set(sprintsView.map(s=>s.sprint));

    const notInSprintView = aRows.filter(r => !sprintSet.has(r.sprint));

    const groupedA = {};
    aRows.forEach(r => { groupedA[r.sprint] = (groupedA[r.sprint] || 0) + 1; });

    const tcPerSprint = await DAL.getTestCasesBySprint();
    const tcMap = {};
    tcPerSprint.forEach(r => { tcMap[r.sprint] = r.total_tests; });

    const missingInTc = [];
    for (const s of Object.keys(groupedA)) {
      const expected = groupedA[s] || 0;
      const actual = tcMap[s] || 0;
      if (actual !== expected) {
        missingInTc.push({ sprint: s, expected, actual });
      }
    }

    console.log('total_rows', total?.total_rows || 0);
    console.log('count_A_done_states', countA);
    console.log('distinct_sprints_in_A', Object.keys(groupedA).length);
    console.log('sprints_in_vw_bugs_by_sprint_count', sprintsView.length);
    console.log('rows_in_A_with_sprint_not_in_vw_bugs_by_sprint', notInSprintView.length);
    if (notInSprintView.length > 0) console.log('example_not_in_view', notInSprintView.slice(0,10));
    console.log('sprints_with_mismatch_expected_vs_tcPerSprint', missingInTc);

    const idsNotCounted = aRows.filter(r => (tcMap[r.sprint] || 0) === 0).map(r=>({id:r.id,sprint:r.sprint,estado:r.estado,resumen:r.resumen}));
    console.log('ids_in_A_but_tcPerSprint_zero_count_example (first 20):', idsNotCounted.slice(0,20));

  } catch (err) {
    console.error('Error during diagnosis:', err);
    process.exit(1);
  }
})();
import DAL from '../lib/database/dal.js';

const DONE_STATES = ['Done','Approved for Release','Reviewed','Testing Complete'];

(async () => {
  try {
    const total = await DAL.runScalar("SELECT COUNT(*) as total_rows FROM bugs_detail");
    const aRows = await DAL.runQuery(`SELECT id, sprint, estado, tipo_incidencia, resumen FROM bugs_detail WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN (${DONE_STATES.map(s=>"'"+s+"'").join(',')})`);
    const countA = aRows.length;

    // sprints present in vw_bugs_by_sprint
    const sprintsView = await DAL.runQuery("SELECT sprint FROM vw_bugs_by_sprint");
    const sprintSet = new Set(sprintsView.map(s=>s.sprint));

    // find rows whose sprint not in vw_bugs_by_sprint
    const notInSprintView = aRows.filter(r => !sprintSet.has(r.sprint));

    // get counts grouped by sprint for A
    const groupedA = {};
    aRows.forEach(r => { groupedA[r.sprint] = (groupedA[r.sprint] || 0) + 1; });

    // get testCases counts per sprint from getTestCasesBySprint
    const tcPerSprint = await DAL.getTestCasesBySprint();
    const tcMap = {};
    tcPerSprint.forEach(r => { tcMap[r.sprint] = r.total_tests; });

    // find A rows not represented in tcPerSprint map or mismatch counts
    const missingInTc = [];
    for (const s of Object.keys(groupedA)) {
      const expected = groupedA[s] || 0;
      const actual = tcMap[s] || 0;
      if (actual !== expected) {
        missingInTc.push({ sprint: s, expected, actual });
      }
    }

    console.log('total_rows', total?.total_rows || 0);
    console.log('count_A_done_states', countA);
    console.log('distinct_sprints_in_A', Object.keys(groupedA).length);
    console.log('sprints_in_vw_bugs_by_sprint_count', sprintsView.length);
    console.log('rows_in_A_with_sprint_not_in_vw_bugs_by_sprint', notInSprintView.length);
    if (notInSprintView.length > 0) console.log('example_not_in_view', notInSprintView.slice(0,10));
    console.log('sprints_with_mismatch_expected_vs_tcPerSprint', missingInTc);

    // also list IDs of rows in A that are not counted in tcPerSprint (i.e., their sprint maps to 0)
    const idsNotCounted = aRows.filter(r => (tcMap[r.sprint] || 0) === 0).map(r=>({id:r.id,sprint:r.sprint,estado:r.estado,resumen:r.resumen}));
    console.log('ids_in_A_but_tcPerSprint_zero_count_example (first 20):', idsNotCounted.slice(0,20));

  } catch (err) {
    console.error('Error during diagnosis:', err);
    process.exit(1);
  }
})();
