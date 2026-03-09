#!/usr/bin/env node
// sum_sprint_testcases moved
console.log('sum_sprint_testcases moved to temp-validation')
import DAL from '../lib/database/dal.js';

(async ()=>{
  try {
    const qa = await DAL.getFullQAData();
    const sprintData = qa.sprintData || [];
    const total = sprintData.reduce((acc,s)=>acc + (Number(s.testCases) || 0), 0);
    console.log('sprintData_count', sprintData.length);
    console.log('sum_sprint_testCases', total);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
