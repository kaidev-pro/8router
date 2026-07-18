// 8Router — i18n Regression Test Runner

import { runI18nRegressionTests } from './i18n-regression.test.js';

const { passed, failed } = runI18nRegressionTests();
console.log(`\ni18n regression result: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
