import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { normalizeCsvText, buildTrialBalanceEntries } from '../src/services/trialBalanceParser.js';

describe('trialBalanceParser', () => {
  it('parses common TB CSV exports (sep/title rows) and balances totals', () => {
    const csv = [
      'sep=,',
      '"Trial Balance Report"',
      '"Name","Category","Source","Debit","Credit"',
      '"Sales","Sales","System Account",,"892772.65"',
      '"Purchases","Cost of Sales","System Account","229464.56",',
      '"Accounting Fees","Expenses","Account Balance","10912.15",',
      '"Bank Charges","Expenses","Account Balance","4076.2",',
      '"Casual Labour","Expenses","Account Balance","1200",',
      '"Electricity & Water","Expenses","Account Balance","1434.78",',
      '"Entertainment","Expenses","Account Balance","3423.52",',
      '"General Expenses","Expenses","Account Balance","699.45",',
      '"Internet Expenses","Expenses","Account Balance","1616.76",',
      '"Mobile Phone Expenses","Expenses","Account Balance","7100.77",',
      '"Motor Vehicle Expenses","Expenses","Account Balance","7755.13",',
      '"Overtime","Expenses","Account Balance","609.38",',
      '"Refreshments","Expenses","Account Balance","15943",',
      '"Rental for Workshop","Expenses","Account Balance","212248.4",',
      '"Salaries & Wages","Expenses","Account Balance","108040.82",',
      '"Service Levies (Workshop)","Expenses","Account Balance","3940",',
      '"Small Tools","Expenses","Account Balance","8097.98",',
      '"Travel & Accommodation","Expenses","Account Balance","2128.87",',
      '"Petty Cash","Current Assets","Bank Account Balance",,"23540.25"',
      '"Steelcraft FNB","Current Assets","Bank Account Balance",,"72577.3"',
      '"Trade Receivables","Current Assets","System Account","387313.25",',
      '"Members Loan","Current Assets","Account Balance",,"54528.75"',
      '"Staff Loans","Current Assets","Account Balance","6210",',
      '"Trade Payables","Current Liabilities","System Account",,"27003.07"',
      '"VAT Payable","Current Liabilities","System Account",,"3444.32"',
      '"PAYE Payable","Current Liabilities","Account Balance","3095.04",',
      '"SDL Payable","Current Liabilities","Account Balance",,"954.64"',
      '"UIF Payable","Current Liabilities","Account Balance","818.92",',
      '"Weekly wages","Current Liabilities","Account Balance","58692",',
      ',,,"1074820.98","1074820.98"',
      '"Net Profit/Loss After Tax",,,,"274080.88"',
    ].join('\n');

    const normalized = normalizeCsvText(csv);
    const result = Papa.parse(normalized, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const { entries, totalDebits, totalCredits } = buildTrialBalanceEntries(result.data, 'tb-test');

    // Summary rows are ignored, and trailing Net Profit row is treated as a summary for this export.
    expect(entries.length).toBe(29);
    expect(Math.abs(totalDebits - 1074820.98)).toBeLessThan(0.01);
    expect(Math.abs(totalCredits - 1074820.98)).toBeLessThan(0.01);
    expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.01);
  });
});
