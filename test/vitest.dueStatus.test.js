import { describe, it, expect } from 'vitest';
import { getFilingStatus } from '../src/lib/dueStatus.js';

describe('getFilingStatus (vitest)', () => {
  it('fully filed in current cycle remains blue', () => {
    const reg = '2017-08-10';
    const cipc = '2025-09-08';
    const bo = '2025-09-08';
    expect(getFilingStatus(reg, cipc, bo)).toBe('blue');
  });

  it('due month october with last filings in dec 2024 -> orange', () => {
    const reg = '2016-10-21';
    const cipc = '2024-12-13';
    const bo = '2024-12-13';
    expect(getFilingStatus(reg, cipc, bo)).toBe('orange');
  });
});
