// 8Router — Typography and Responsive UI Test Runner

import { runTypographyResponsiveTests } from './typography-responsive.test.js';

const { passed, failed } = runTypographyResponsiveTests();
console.log(`\ntypography responsive result: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
