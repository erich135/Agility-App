// South African Financial Statement Utilities
// Compliant with IFRS for SMEs, Companies Act 71 of 2008, and SARS requirements

// SA Tax Rates (2024/2025 tax year)
export const SA_TAX_RATES = {
  CORPORATE_TAX: 0.27, // 27%
  VAT: 0.15, // 15%
  DIVIDEND_TAX: 0.20, // 20%
  CGT_INCLUSION_RATE: 0.80, // 80%
  UIF_EMPLOYEE: 0.01, // 1%
  UIF_EMPLOYER: 0.01, // 1%
  SDL: 0.01, // 1% (Skills Development Levy)
};

// Financial Statement Line Item Mappings
export const STATEMENT_LINE_ITEMS = {
  STATEMENT_OF_FINANCIAL_POSITION: {
    CURRENT_ASSETS: {
      CASH: 'cash',
      TRADE_RECEIVABLES: 'trade_receivables',
      OTHER_RECEIVABLES: 'other_receivables',
      INVENTORIES: 'inventories',
      PREPAYMENTS: 'prepayments',
    },
    NON_CURRENT_ASSETS: {
      PROPERTY_PLANT_EQUIPMENT: 'property_plant_equipment',
      INTANGIBLE_ASSETS: 'intangible_assets',
      INVESTMENTS: 'investments',
      DEFERRED_TAX_ASSET: 'deferred_tax_asset',
    },
    EQUITY: {
      SHARE_CAPITAL: 'share_capital',
      RETAINED_EARNINGS: 'retained_earnings',
      OTHER_RESERVES: 'other_reserves',
    },
    CURRENT_LIABILITIES: {
      TRADE_PAYABLES: 'trade_payables',
      OTHER_PAYABLES: 'other_payables',
      SHORT_TERM_BORROWINGS: 'short_term_borrowings',
      CURRENT_TAX_LIABILITY: 'current_tax_liability',
    },
    NON_CURRENT_LIABILITIES: {
      LONG_TERM_BORROWINGS: 'long_term_borrowings',
      DEFERRED_TAX_LIABILITY: 'deferred_tax_liability',
    }
  },
  STATEMENT_OF_COMPREHENSIVE_INCOME: {
    REVENUE: 'revenue',
    COST_OF_SALES: 'cost_of_sales',
    GROSS_PROFIT: 'gross_profit',
    OTHER_INCOME: 'other_income',
    ADMINISTRATIVE_EXPENSES: 'administrative_expenses',
    DISTRIBUTION_COSTS: 'distribution_costs',
    OTHER_EXPENSES: 'other_expenses',
    FINANCE_INCOME: 'finance_income',
    FINANCE_COSTS: 'finance_costs',
    PROFIT_BEFORE_TAX: 'profit_before_tax',
    TAX_EXPENSE: 'tax_expense',
    PROFIT_FOR_YEAR: 'profit_for_year',
  }
};

// Default Account Number Mappings
export const DEFAULT_ACCOUNT_MAPPINGS = {
  // Assets (1000-2999)
  '1000-1199': 'cash',
  '1200-1299': 'trade_receivables',
  '1300-1399': 'inventories',
  '1400-1499': 'other_receivables',
  '1500-1599': 'prepayments',
  '2000-2199': 'property_plant_equipment',
  '2200-2299': 'intangible_assets',
  '2300-2399': 'investments',
  
  // Liabilities (3000-4999)
  '3000-3199': 'trade_payables',
  '3200-3299': 'other_payables',
  '3300-3399': 'short_term_borrowings',
  '3400-3499': 'current_tax_liability',
  '4000-4199': 'long_term_borrowings',
  '4200-4299': 'deferred_tax_liability',
  
  // Equity (5000-5999)
  '5000-5199': 'share_capital',
  '5800-5999': 'retained_earnings',
  
  // Revenue (6000-6999)
  '6000-6999': 'revenue',
  
  // Expenses (7000-8999)
  '7000-7299': 'cost_of_sales',
  '7300-7599': 'administrative_expenses',
  '7600-7799': 'distribution_costs',
  '8000-8999': 'other_expenses',
};

/**
 * Format currency amounts to South African Rand
 */
export function formatCurrency(amount, includeCurrency = true) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'R 0.00';
  
  const formatted = Math.abs(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const sign = amount < 0 ? '-' : '';
  return includeCurrency ? `${sign}R ${formatted}` : `${sign}${formatted}`;
}

/**
 * Format percentage values
 */
export function formatPercentage(value, decimalPlaces = 2) {
  if (typeof value !== 'number' || isNaN(value)) return '0.00%';
  return `${(value * 100).toFixed(decimalPlaces)}%`;
}

/**
 * Get financial year from a date (SA financial year: 1 March - 28/29 February)
 */
export function getFinancialYear(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1; // getMonth() is 0-based
  const year = d.getFullYear();
  
  // SA financial year runs from 1 March to 28/29 February
  if (month >= 3) {
    return year + 1; // e.g., March 2023 is part of 2024 financial year
  } else {
    return year;
  }
}

/**
 * Calculate corporate income tax
 */
export function calculateCorporateIncomeTax(taxableIncome) {
  return Math.max(0, taxableIncome * SA_TAX_RATES.CORPORATE_TAX);
}

/**
 * Calculate VAT on supplies
 */
export function calculateVAT(amount, isVatInclusive = false) {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  
  if (isVatInclusive) {
    return amount * SA_TAX_RATES.VAT / (1 + SA_TAX_RATES.VAT);
  }
  return amount * SA_TAX_RATES.VAT;
}

/**
 * Calculate UIF contributions
 */
export function calculateUIF(salary) {
  const maxSalary = 17712; // UIF salary ceiling (2024)
  const applicableSalary = Math.min(salary, maxSalary);
  
  const employee = applicableSalary * SA_TAX_RATES.UIF_EMPLOYEE;
  const employer = applicableSalary * SA_TAX_RATES.UIF_EMPLOYER;
  
  return {
    employee,
    employer,
    total: employee + employer
  };
}

/**
 * Calculate SDL (Skills Development Levy)
 */
export function calculateSDL(totalPayroll) {
  const threshold = 500000; // SDL threshold
  return totalPayroll > threshold ? totalPayroll * SA_TAX_RATES.SDL : 0;
}

/**
 * Determine account type from account number
 */
export function determineAccountType(accountNumber) {
  const num = parseInt(accountNumber);
  
  if (isNaN(num)) return 'UNKNOWN';
  
  if (num >= 1000 && num <= 2999) return 'ASSET';
  if (num >= 3000 && num <= 4999) return 'LIABILITY';
  if (num >= 5000 && num <= 5999) return 'EQUITY';
  if (num >= 6000 && num <= 6999) return 'REVENUE';
  if (num >= 7000 && num <= 8999) return 'EXPENSE';
  
  // Default mapping based on first digit
  const firstDigit = Math.floor(num / 1000);
  switch (firstDigit) {
    case 1:
    case 2:
      return 'ASSET';
    case 3:
    case 4:
      return 'LIABILITY';
    case 5:
      return 'EQUITY';
    case 6:
      return 'REVENUE';
    case 7:
    case 8:
    case 9:
      return 'EXPENSE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Validate South African company registration number
 */
export function validateRegistrationNumber(regNumber) {
  if (!regNumber) return false;
  // SA company registration format: YYYY/######/##
  const pattern = /^\d{4}\/\d{6}\/\d{2}$/;
  return pattern.test(regNumber);
}

/**
 * Validate South African tax number
 */
export function validateTaxNumber(taxNumber) {
  if (!taxNumber) return false;
  // SA tax number format: ##########
  const pattern = /^\d{10}$/;
  return pattern.test(taxNumber);
}

/**
 * Validate South African VAT number
 */
export function validateVATNumber(vatNumber) {
  if (!vatNumber) return false;
  // SA VAT number format: ##########
  const pattern = /^\d{10}$/;
  return pattern.test(vatNumber);
}

/**
 * Generate account mapping suggestions based on account name and number
 */
export function suggestAccountMapping(accountNumber, accountName) {
  const suggestions = [];
  const name = accountName.toLowerCase();
  const num = parseInt(accountNumber);
  
  // First, try number-based mapping
  for (const [range, mapping] of Object.entries(DEFAULT_ACCOUNT_MAPPINGS)) {
    const [start, end] = range.split('-').map(r => parseInt(r));
    if (num >= start && num <= end) {
      suggestions.push(mapping);
      break;
    }
  }
  
  // Then, try name-based mapping
  if (name.includes('cash') || name.includes('bank')) {
    suggestions.push('cash');
  }
  if (name.includes('receivable') || name.includes('debtor')) {
    suggestions.push('trade_receivables');
  }
  if (name.includes('inventory') || name.includes('stock')) {
    suggestions.push('inventories');
  }
  if (name.includes('payable') || name.includes('creditor')) {
    suggestions.push('trade_payables');
  }
  if (name.includes('revenue') || name.includes('sale') || name.includes('income')) {
    suggestions.push('revenue');
  }
  if (name.includes('cost') && name.includes('sale')) {
    suggestions.push('cost_of_sales');
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Calculate key financial ratios
 */
export function calculateFinancialRatios(statementData) {
  const { 
    statement_of_financial_position: sfp,
    statement_of_comprehensive_income: sci 
  } = statementData;
  
  if (!sfp || !sci) return {};
  
  const ratios = {};
  
  // Liquidity ratios
  if (sfp.currentLiabilities?.total > 0) {
    ratios.currentRatio = sfp.currentAssets?.total / sfp.currentLiabilities?.total;
    ratios.quickRatio = (sfp.currentAssets?.total - (sfp.currentAssets?.inventories || 0)) / sfp.currentLiabilities?.total;
  }
  
  // Profitability ratios
  if (sci.revenue > 0) {
    ratios.grossProfitMargin = sci.grossProfit / sci.revenue;
    ratios.netProfitMargin = sci.profitForTheYear / sci.revenue;
  }
  
  // Efficiency ratios
  if (sfp.totalAssets > 0) {
    ratios.returnOnAssets = sci.profitForTheYear / sfp.totalAssets;
  }
  
  if (sfp.equity?.total > 0) {
    ratios.returnOnEquity = sci.profitForTheYear / sfp.equity?.total;
  }
  
  // Leverage ratios
  if (sfp.equity?.total > 0) {
    const totalLiabilities = (sfp.currentLiabilities?.total || 0) + (sfp.nonCurrentLiabilities?.total || 0);
    ratios.debtToEquityRatio = totalLiabilities / sfp.equity?.total;
  }
  
  return ratios;
}

/**
 * Validate trial balance (debits = credits)
 */
export function validateTrialBalance(entries) {
  if (!Array.isArray(entries)) return { isBalanced: false, totalDebits: 0, totalCredits: 0, difference: 0 };
  
  const totalDebits = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);
  const totalCredits = entries.reduce((sum, entry) => sum + (parseFloat(entry.credit_amount) || 0), 0);
  const difference = totalDebits - totalCredits;
  
  return {
    isBalanced: Math.abs(difference) < 0.01, // Allow for minor rounding differences
    totalDebits,
    totalCredits,
    difference
  };
}

/**
 * Generate statement of financial position from trial balance entries
 */
export function generateStatementOfFinancialPosition(trialBalanceEntries, accountMappings = {}) {
  const statement = {
    currentAssets: { total: 0 },
    nonCurrentAssets: { total: 0 },
    totalAssets: 0,
    equity: { total: 0 },
    currentLiabilities: { total: 0 },
    nonCurrentLiabilities: { total: 0 },
    totalEquityAndLiabilities: 0
  };
  
  // Initialize line items
  Object.values(STATEMENT_LINE_ITEMS.STATEMENT_OF_FINANCIAL_POSITION.CURRENT_ASSETS).forEach(item => {
    statement.currentAssets[item] = 0;
  });
  Object.values(STATEMENT_LINE_ITEMS.STATEMENT_OF_FINANCIAL_POSITION.NON_CURRENT_ASSETS).forEach(item => {
    statement.nonCurrentAssets[item] = 0;
  });
  Object.values(STATEMENT_LINE_ITEMS.STATEMENT_OF_FINANCIAL_POSITION.EQUITY).forEach(item => {
    statement.equity[item] = 0;
  });
  Object.values(STATEMENT_LINE_ITEMS.STATEMENT_OF_FINANCIAL_POSITION.CURRENT_LIABILITIES).forEach(item => {
    statement.currentLiabilities[item] = 0;
  });
  Object.values(STATEMENT_LINE_ITEMS.STATEMENT_OF_FINANCIAL_POSITION.NON_CURRENT_LIABILITIES).forEach(item => {
    statement.nonCurrentLiabilities[item] = 0;
  });
  
  // Process trial balance entries
  trialBalanceEntries.forEach(entry => {
    const balance = parseFloat(entry.balance) || 0;
    const accountType = entry.account_type;
    const mappedItem = entry.mapped_line_item || accountMappings[entry.account_number];
    
    if (!mappedItem) return;
    
    // Assets have normal debit balances, Liabilities and Equity have normal credit balances
    const adjustedBalance = (accountType === 'ASSET') ? balance : -balance;
    
    if (statement.currentAssets.hasOwnProperty(mappedItem)) {
      statement.currentAssets[mappedItem] += adjustedBalance;
    } else if (statement.nonCurrentAssets.hasOwnProperty(mappedItem)) {
      statement.nonCurrentAssets[mappedItem] += adjustedBalance;
    } else if (statement.equity.hasOwnProperty(mappedItem)) {
      statement.equity[mappedItem] += Math.abs(adjustedBalance);
    } else if (statement.currentLiabilities.hasOwnProperty(mappedItem)) {
      statement.currentLiabilities[mappedItem] += Math.abs(adjustedBalance);
    } else if (statement.nonCurrentLiabilities.hasOwnProperty(mappedItem)) {
      statement.nonCurrentLiabilities[mappedItem] += Math.abs(adjustedBalance);
    }
  });
  
  // Calculate totals
  statement.currentAssets.total = Object.values(statement.currentAssets)
    .filter(val => typeof val === 'number').reduce((sum, val) => sum + val, 0);
  statement.nonCurrentAssets.total = Object.values(statement.nonCurrentAssets)
    .filter(val => typeof val === 'number').reduce((sum, val) => sum + val, 0);
  statement.totalAssets = statement.currentAssets.total + statement.nonCurrentAssets.total;
  
  statement.equity.total = Object.values(statement.equity)
    .filter(val => typeof val === 'number').reduce((sum, val) => sum + val, 0);
  statement.currentLiabilities.total = Object.values(statement.currentLiabilities)
    .filter(val => typeof val === 'number').reduce((sum, val) => sum + val, 0);
  statement.nonCurrentLiabilities.total = Object.values(statement.nonCurrentLiabilities)
    .filter(val => typeof val === 'number').reduce((sum, val) => sum + val, 0);
  statement.totalEquityAndLiabilities = statement.equity.total + statement.currentLiabilities.total + statement.nonCurrentLiabilities.total;
  
  return statement;
}

/**
 * Generate statement of comprehensive income from trial balance entries
 */
export function generateStatementOfComprehensiveIncome(trialBalanceEntries, accountMappings = {}) {
  const statement = {
    revenue: 0,
    cost_of_sales: 0,
    gross_profit: 0,
    administrative_expenses: 0,
    distribution_costs: 0,
    other_expenses: 0,
    other_income: 0,
    operating_profit: 0,
    finance_income: 0,
    finance_costs: 0,
    profit_before_tax: 0,
    tax_expense: 0,
    profit_for_year: 0
  };
  
  // Process trial balance entries
  trialBalanceEntries.forEach(entry => {
    const balance = Math.abs(parseFloat(entry.balance) || 0);
    const accountType = entry.account_type;
    const mappedItem = entry.mapped_line_item || accountMappings[entry.account_number];
    
    if (!mappedItem || (accountType !== 'REVENUE' && accountType !== 'EXPENSE')) return;
    
    if (statement.hasOwnProperty(mappedItem)) {
      statement[mappedItem] += balance;
    }
  });
  
  // Calculate derived figures
  statement.gross_profit = statement.revenue - statement.cost_of_sales;
  statement.operating_profit = statement.gross_profit - statement.administrative_expenses - statement.distribution_costs - statement.other_expenses + statement.other_income;
  statement.profit_before_tax = statement.operating_profit + statement.finance_income - statement.finance_costs;
  statement.profit_for_year = statement.profit_before_tax - statement.tax_expense;
  
  return statement;
}

/**
 * Export functions for use in components
 */
export default {
  SA_TAX_RATES,
  STATEMENT_LINE_ITEMS,
  DEFAULT_ACCOUNT_MAPPINGS,
  formatCurrency,
  formatPercentage,
  getFinancialYear,
  calculateCorporateIncomeTax,
  calculateVAT,
  calculateUIF,
  calculateSDL,
  determineAccountType,
  validateRegistrationNumber,
  validateTaxNumber,
  validateVATNumber,
  suggestAccountMapping,
  calculateFinancialRatios,
  validateTrialBalance,
  generateStatementOfFinancialPosition,
  generateStatementOfComprehensiveIncome
};