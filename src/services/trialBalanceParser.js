// Utilities for parsing common trial balance CSV/Excel exports into a consistent entry format.

const stripBom = (text) => text.replace(/^\uFEFF/, '');

const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const inferAccountType = (categoryRaw, accountNameRaw) => {
  const category = String(categoryRaw || '').toLowerCase();
  const accountName = String(accountNameRaw || '').toLowerCase();

  const text = `${category} ${accountName}`.trim();
  if (!text) return 'EXPENSE';

  if (/(asset|receivable|inventory|bank|cash|prepay|debtor)/i.test(text)) return 'ASSET';
  if (/(liabil|payable|creditor|vat|paye|uif|sdl|loan)/i.test(text)) return 'LIABILITY';
  if (/(equity|capital|retained|share)/i.test(text)) return 'EQUITY';
  if (/(sales|revenue|income)/i.test(text)) return 'REVENUE';
  if (/(expense|cost|cogs|purchase|wage|salary|rent|admin)/i.test(text)) return 'EXPENSE';

  // Reasonable default for unclassified lines in most TB exports
  return 'EXPENSE';
};

export const normalizeCsvText = (csvText) => {
  const text = stripBom(csvText || '');
  const lines = text.split(/\r?\n/);

  // Remove Excel's `sep=,` prefix line if present.
  const withoutSep = lines.filter((line) => !/^\s*sep\s*=\s*.+\s*$/i.test(line));

  // Find a likely header row.
  const headerIndex = withoutSep.findIndex((line) => {
    const normalized = line.toLowerCase();
    return (
      normalized.includes('debit') &&
      normalized.includes('credit') &&
      (normalized.includes(',') || normalized.includes('\t') || normalized.includes(';'))
    );
  });

  if (headerIndex === -1) return withoutSep.join('\n');
  return withoutSep.slice(headerIndex).join('\n');
};

export const buildTrialBalanceEntries = (parsedRows, trialBalanceId) => {
  let totalDebits = 0;
  let totalCredits = 0;
  const entries = [];

  for (const row of parsedRows || []) {
    const category = String(firstValue(row, ['Category', 'Account Type', 'Type'])).trim();
    const source = String(firstValue(row, ['Source'])).trim();

    const accountCode = String(
      firstValue(row, ['Account Code', 'Account', 'Code', 'Account Number', 'Account No', 'Number'])
    ).trim();

    const accountName = String(
      firstValue(row, [
        'Account Name',
        'Account Description',
        'Description',
        'Name',
        'Account',
        'Ledger',
        'GL Account',
      ])
    ).trim();

    const debitAmount = safeNumber(firstValue(row, ['Debit', 'Debit Amount', 'DR', 'Debits']));
    const creditAmount = safeNumber(firstValue(row, ['Credit', 'Credit Amount', 'CR', 'Credits']));

    // Some exports include post-total lines like "Net Profit/Loss After Tax" with empty category/source.
    // Treat these as summaries rather than transactional TB lines to avoid false imbalance.
    if (/^net\s+profit/i.test(accountName) && !category && !source && !accountCode) continue;

    if (accountName && (debitAmount !== 0 || creditAmount !== 0)) {
      const inferredAccountType = inferAccountType(category, accountName);
      entries.push({
        trial_balance_id: trialBalanceId,
        account_number: accountCode || accountName,
        account_name: accountName,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        balance: debitAmount - creditAmount,
        account_type: inferredAccountType,
      });

      totalDebits += debitAmount;
      totalCredits += creditAmount;
    }
  }

  return { entries, totalDebits, totalCredits };
};
