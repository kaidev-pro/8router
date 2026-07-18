// 8Router — Doctor Hygiene Test Runner

import { runDoctorHygieneTests } from './doctor-hygiene.test.js';

const { passed, failed } = runDoctorHygieneTests();
console.log(`\ndoctor hygiene result: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
