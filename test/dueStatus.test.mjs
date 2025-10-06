import assert from 'assert';
import { getFilingStatus } from '../src/lib/dueStatus.js';

console.log('Running dueStatus tests (assumes current date Oct 6, 2025)');

// Test 1: Reg month = August; both filings after Aug 1 2025 -> should be BLUE
const reg1 = '2017-08-10';
const cipc1 = '2025-09-08';
const bo1 = '2025-09-08';
const res1 = getFilingStatus(reg1, cipc1, bo1);
console.log('Test1:', res1);
assert.strictEqual(res1, 'blue', 'Expected blue for fully-filed in current cycle');

// Test 2: Reg month = October; last filings were Dec 13 2024 -> before Oct 1 2025 -> should be ORANGE (we are Oct 6)
const reg2 = '2016-10-21';
const cipc2 = '2024-12-13';
const bo2 = '2024-12-13';
const res2 = getFilingStatus(reg2, cipc2, bo2);
console.log('Test2:', res2);
assert.strictEqual(res2, 'orange', 'Expected orange for due month Oct and not filed this cycle');

// Test 3: Missing registration date -> default BLUE
const res3 = getFilingStatus(null, null, null);
console.log('Test3:', res3);
assert.strictEqual(res3, 'blue', 'Expected blue when registration date missing');

console.log('All tests passed!');
