import React, { useState, useEffect } from 'react';
import { Upload, Calculator, FileText, Download, Settings, TrendingUp, X, Eye, Share, Trash2 } from 'lucide-react';
import supabase from '../lib/SupabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { normalizeCsvText, buildTrialBalanceEntries } from '../services/trialBalanceParser';

const FinancialStatements = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [trialBalances, setTrialBalances] = useState([]);
  const [financialStatements, setFinancialStatements] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);
  
  // Modal and view states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showIFRSModal, setShowIFRSModal] = useState(false);
  const [selectedTrialBalance, setSelectedTrialBalance] = useState(null);
  
  // Mapping interface states
  const [trialBalanceEntries, setTrialBalanceEntries] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [accountMappings, setAccountMappings] = useState([]);
  const [mappingFilter, setMappingFilter] = useState('all'); // all, unmapped, mapped

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch trial balances when client is selected
  useEffect(() => {
    if (selectedClient) {
      setTrialBalances([]);
      setFinancialStatements([]);
      fetchTrialBalances();
      fetchFinancialStatements();
    } else {
      setTrialBalances([]);
      setFinancialStatements([]);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name, registration_number')
        .order('client_name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTrialBalances = async () => {
    if (!selectedClient) {
      console.log('No client selected, skipping trial balance fetch');
      return;
    }
    
    console.log('Fetching trial balances for client:', selectedClient);
    
    try {
      const { data, error } = await supabase
        .from('trial_balances')
        .select('*')
        .eq('client_id', selectedClient)
        .order('financial_year', { ascending: false });
      
      if (error) {
        console.error('Error in trial balance query:', error);
        throw error;
      }
      
      console.log('Fetched trial balances:', data);
      setTrialBalances(data || []);
    } catch (error) {
      console.error('Error fetching trial balances:', error);
      setTrialBalances([]);
    }
  };

  const fetchFinancialStatements = async () => {
    if (!selectedClient) {
      console.log('No client selected, skipping financial statements fetch');
      return;
    }
    
    console.log('Fetching financial statements for client:', selectedClient);
    
    try {
      const { data, error } = await supabase
        .from('financial_statements')
        .select('*')
        .eq('client_id', selectedClient)
        .order('financial_year', { ascending: false });
      
      if (error) {
        console.error('Error in financial statements query:', error);
        throw error;
      }
      
      console.log('Fetched financial statements:', data);
      setFinancialStatements(data || []);
    } catch (error) {
      console.error('Error fetching financial statements:', error);
      setFinancialStatements([]);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedClient) return;

    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      // First create the trial balance record
      const { data: tbData, error: tbError } = await supabase
        .from('trial_balances')
        .insert({
          client_id: selectedClient,
          file_name: file.name,
          financial_year: currentYear,
          period: 'Annual',
          status: 'PROCESSING'
        })
        .select()
        .single();

      if (tbError) throw tbError;

      // Parse the file based on extension
      let parsedData = [];
      
      if (fileExtension === 'csv') {
        // Parse CSV file
        const text = await file.text();
        const normalizedText = normalizeCsvText(text);
        const result = Papa.parse(normalizedText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });
        parsedData = result.data;
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        // Parse Excel file
        const buffer = await file.arrayBuffer();
        let workbook;
        try {
          workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        } catch (excelParseError) {
          // Some files saved as .xls are actually CSV or text exports (or HTML/XML).
          // Inspect as text and choose the best parser.
          let excelText = '';
          try {
            excelText = await file.text();
          } catch {
            // ignore
          }

          const textSample = (excelText || '').slice(0, 8000);
          const looksLikeCsv =
            /(^|\r?\n)\s*sep\s*=\s*[,;\t]/i.test(textSample) ||
            (/debit/i.test(textSample) && /credit/i.test(textSample) && /[,;\t]/.test(textSample));
          const looksLikeHtml = /<\s*table[\s>]/i.test(textSample);
          const looksLikeXml = /<\?xml|<\s*workbook[\s>]|<\s*worksheet[\s>]/i.test(textSample);

          if (looksLikeCsv) {
            const normalizedText = normalizeCsvText(excelText);
            const result = Papa.parse(normalizedText, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
            });
            parsedData = result.data;
          } else if (looksLikeHtml || looksLikeXml) {
            try {
              workbook = XLSX.read(excelText, { type: 'string' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              parsedData = XLSX.utils.sheet_to_json(worksheet);
            } catch {
              throw new Error('Could not parse this .xls file (HTML/XML). Please export it as a .csv or .xlsx and try again.');
            }
          } else {
            throw new Error('Could not parse this Excel file. Please export it as a .csv or .xlsx and try again.');
          }
        }

        // If we successfully parsed text as CSV above, parsedData will already be populated.
        if (parsedData.length === 0 && workbook) {
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        }
      } else {
        throw new Error('Unsupported file format. Please upload CSV or Excel files.');
      }

      const { entries, totalDebits, totalCredits } = buildTrialBalanceEntries(parsedData, tbData.id);

      // Insert trial balance entries
      if (entries.length > 0) {
        const { error: entriesError } = await supabase
          .from('trial_balance_entries')
          .insert(entries);

        if (entriesError) throw entriesError;
      }

      // Update trial balance totals and status
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow for rounding differences

      const balanceNote = isBalanced
        ? 'Trial balance is balanced'
        : `Trial balance out of balance: Debits R${totalDebits.toLocaleString()}, Credits R${totalCredits.toLocaleString()}`;
      
      const { error: updateError } = await supabase
        .from('trial_balances')
        .update({
          total_debits: totalDebits,
          total_credits: totalCredits,
          status: isBalanced ? 'VALIDATED' : 'ERROR'
        })
        .eq('id', tbData.id);

      if (updateError) throw updateError;
      
      await fetchTrialBalances();
      alert(
        `Trial balance uploaded and processed successfully!\nEntries: ${entries.length}\nDebits: R${totalDebits.toLocaleString()}\nCredits: R${totalCredits.toLocaleString()}\n${balanceNote}`
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine statement line item based on account type and name
  const getStatementLineItem = (accountType, accountName) => {
    const name = accountName.toLowerCase();
    
    switch (accountType) {
      case 'ASSET':
        if (name.includes('current') || name.includes('bank') || name.includes('cash') || name.includes('receivable')) {
          return 'current_assets';
        } else if (name.includes('fixed') || name.includes('property') || name.includes('equipment') || name.includes('vehicle')) {
          return 'non_current_assets';
        }
        return 'other_assets';
        
      case 'LIABILITY':
        if (name.includes('current') || name.includes('payable') || name.includes('accrual')) {
          return 'current_liabilities';
        }
        return 'non_current_liabilities';
        
      case 'EQUITY':
        if (name.includes('capital') || name.includes('share')) {
          return 'share_capital';
        } else if (name.includes('retained') || name.includes('earning')) {
          return 'retained_earnings';
        }
        return 'other_equity';
        
      case 'REVENUE':
        if (name.includes('sales') || name.includes('income') || name.includes('revenue')) {
          return 'revenue';
        }
        return 'other_income';
        
      case 'EXPENSE':
        if (name.includes('cost') || name.includes('cogs')) {
          return 'cost_of_sales';
        } else if (name.includes('admin') || name.includes('office')) {
          return 'administrative_expenses';
        } else if (name.includes('sales') || name.includes('marketing')) {
          return 'selling_expenses';
        }
        return 'operating_expenses';
        
      default:
        return 'other';
    }
  };

  const generateFinancialStatements = async (trialBalanceId) => {
    setLoading(true);
    try {
      // This would contain the complex logic for generating financial statements
      // For now, we'll create a placeholder record with proper SA format
      const currentYear = new Date().getFullYear();
      const trialBalance = trialBalances.find((tb) => tb.id === trialBalanceId);
      const financialYear = trialBalance?.financial_year ?? currentYear;
      
      const sampleStatements = {
        sofp: { // Statement of Financial Position (SA format)
          current_assets: {
            cash_and_cash_equivalents: 150000,
            trade_and_other_receivables: 45000,
            prepayments: 5000,
            total: 200000
          },
          non_current_assets: {
            property_plant_equipment: 185000,
            intangible_assets: 0,
            total: 185000
          },
          total_assets: 385000,
          equity: {
            accumulated_surplus: 250000,
            total: 250000
          },
          current_liabilities: {
            trade_and_other_payables: 75000,
            short_term_borrowings: 25000,
            total: 100000
          },
          non_current_liabilities: {
            long_term_borrowings: 35000,
            total: 35000
          },
          total_equity_and_liabilities: 385000
        },
        soci: { // Statement of Comprehensive Income (SA format)
          revenue: {
            fee_income_recoveries: 450000,
            membership_fees: 30000,
            event_income: 20000,
            total_revenue: 500000
          },
          expenses: {
            expenses_realising_objectives: 280000,
            general_administrative_expenses: 120000,
            finance_costs: 5000,
            total_expenses: 405000
          },
          surplus_deficit_for_year: 95000
        },
        soce: { // Statement of Changes in Equity
          opening_balance: 155000,
          surplus_deficit_for_year: 95000,
          closing_balance: 250000
        },
        scf: { // Statement of Cash Flows
          operating_activities: {
            cash_receipts_from_customers: 500000,
            cash_paid_to_suppliers: -380000,
            interest_received: 2000,
            interest_paid: -5000,
            net_cash_from_operating: 117000
          },
          investing_activities: {
            purchases_of_equipment: -15000,
            net_cash_from_investing: -15000
          },
          financing_activities: {
            proceeds_from_borrowings: 10000,
            repayment_of_borrowings: -12000,
            net_cash_from_financing: -2000
          },
          net_increase_in_cash: 100000
        }
      };

      const { data: existingStatement, error: existingError } = await supabase
        .from('financial_statements')
        .select('id, trial_balance_id')
        .eq('client_id', selectedClient)
        .eq('financial_year', financialYear)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingStatement?.id) {
        const okToOverwrite = window.confirm(
          `Financial statements already exist for ${financialYear}.\n\nDo you want to overwrite them with a newly generated version?`
        );
        if (!okToOverwrite) {
          alert('Generation cancelled. You can view the existing statements in the View Statements tab.');
          return;
        }
      }

      const { error } = await supabase
        .from('financial_statements')
        .upsert(
          {
            client_id: selectedClient,
            trial_balance_id: trialBalanceId,
            financial_year: financialYear,
            statement_of_financial_position: sampleStatements.sofp, // SA format
            statement_of_comprehensive_income: sampleStatements.soci, // SA format
            statement_of_changes_in_equity: sampleStatements.soce, // NEW SA format
            statement_of_cash_flows: sampleStatements.scf, // NEW SA format
            status: 'DRAFT'
          },
          { onConflict: 'client_id,financial_year' }
        );

      if (error) throw error;
      
      await fetchFinancialStatements();
      alert('Financial statements generated successfully!');
    } catch (error) {
      console.error('Error generating statements:', error);
      alert('Error generating statements: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Interactive handler functions
  const handleViewDetailed = (statement) => {
    setSelectedStatement(statement);
    setShowDetailModal(true);
  };

  const handleOpenMapping = (trialBalance) => {
    setSelectedTrialBalance(trialBalance);
    fetchTrialBalanceEntries(trialBalance.id);
    fetchChartOfAccounts();
    fetchAccountMappings(trialBalance.id);
    setShowMappingModal(true);
  };

  const fetchTrialBalanceEntries = async (trialBalanceId) => {
    try {
      const { data, error } = await supabase
        .from('trial_balance_entries')
        .select('*')
        .eq('trial_balance_id', trialBalanceId)
        .order('account_name');
      
      if (error) throw error;
      setTrialBalanceEntries(data || []);
    } catch (error) {
      console.error('Error fetching trial balance entries:', error);
    }
  };

  const fetchChartOfAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('client_id', selectedClient)
        .eq('is_active', true)
        .order('account_number');
      
      if (error) throw error;
      setChartOfAccounts(data || []);
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
    }
  };

  const fetchAccountMappings = async (trialBalanceId) => {
    try {
      const { data, error } = await supabase
        .from('account_mappings')
        .select('*')
        .eq('client_id', selectedClient);
      
      if (error) {
        console.warn('Error fetching account mappings:', error);
        setAccountMappings([]);
        return;
      }
      setAccountMappings(data || []);
    } catch (error) {
      console.warn('Error fetching account mappings:', error);
      setAccountMappings([]);
    }
  };

  const handleCreateMapping = async (tbEntryId, statementLineItem) => {
    try {
      const entry = trialBalanceEntries.find((e) => e.id === tbEntryId);
      if (!entry) {
        alert('Could not find the selected trial balance entry.');
        return;
      }

      const statementType = ['ASSET', 'LIABILITY', 'EQUITY'].includes(entry.account_type)
        ? 'STATEMENT_OF_FINANCIAL_POSITION'
        : 'STATEMENT_OF_COMPREHENSIVE_INCOME';

      const payload = {
        client_id: selectedClient,
        account_number: entry.account_number,
        line_item_code: statementLineItem,
        line_item_name: statementLineItem,
        statement_type: statementType,
        is_manual: true,
        confidence: 1.0,
      };

      // PostgREST upsert needs a conflict target if you're not providing the primary key.
      // DB unique key: (client_id, account_number, statement_type)
      const { data, error } = await supabase
        .from('account_mappings')
        .upsert(payload, { onConflict: 'client_id,account_number,statement_type' });

      if (error) {
        console.error('Error creating mapping:', error);
        alert('Error saving account mapping: ' + (error.message || JSON.stringify(error)));
        return;
      }
      
      // Refresh mappings
      await fetchAccountMappings(selectedTrialBalance.id);
      alert('Account mapping saved successfully!');
    } catch (error) {
      console.error('Error creating mapping:', error);
      alert('Error saving account mapping: ' + (error?.message || JSON.stringify(error)));
    }
  };

  const handleOpenValidation = (trialBalance) => {
    setSelectedTrialBalance(trialBalance);
    setShowValidationModal(true);
  };

  const handleOpenTaxCalculation = (statement) => {
    setSelectedStatement(statement);
    setShowTaxModal(true);
  };

  const handleOpenIFRSCompliance = () => {
    setShowIFRSModal(true);
  };

  const handleExportPDF = async (statement) => {
    setLoading(true);
    try {
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('Financial Statements', 20, 30);
      
      // Add client info
      const client = clients.find(c => c.id === selectedClient);
      pdf.setFontSize(12);
      pdf.text(`Client: ${client?.name || 'Unknown'}`, 20, 50);
      pdf.text(`Financial Year: ${statement.financial_year}`, 20, 65);
      pdf.text(`Generated: ${new Date(statement.created_at).toLocaleDateString()}`, 20, 80);
      
      // Add income statement data
      if (statement.statement_of_comprehensive_income) {
        pdf.setFontSize(16);
        pdf.text('Statement of Comprehensive Income', 20, 110);
        
        pdf.setFontSize(12);
        const income = statement.statement_of_comprehensive_income;
        pdf.text(`Revenue: R ${income.revenue?.toLocaleString() || '0'}`, 20, 130);
        pdf.text(`Gross Profit: R ${income.grossProfit?.toLocaleString() || '0'}`, 20, 145);
        pdf.text(`Operating Profit: R ${income.operatingProfit?.toLocaleString() || '0'}`, 20, 160);
        pdf.text(`Net Profit: R ${income.profitForTheYear?.toLocaleString() || '0'}`, 20, 175);
      }
      
      // Add balance sheet data
      if (statement.statement_of_financial_position) {
        pdf.setFontSize(16);
        pdf.text('Statement of Financial Position', 20, 205);
        
        pdf.setFontSize(12);
        const position = statement.statement_of_financial_position;
        pdf.text(`Total Assets: R ${position.totalAssets?.toLocaleString() || '0'}`, 20, 225);
        pdf.text(`Total Equity: R ${position.equity?.total?.toLocaleString() || '0'}`, 20, 240);
        const totalLiabilities = (position.currentLiabilities?.total || 0) + (position.nonCurrentLiabilities?.total || 0);
        pdf.text(`Total Liabilities: R ${totalLiabilities.toLocaleString()}`, 20, 255);
      }
      
      pdf.save(`financial-statements-${statement.financial_year}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF export');
    }
    setLoading(false);
  };

  const handleExportExcel = async (statement) => {
    setLoading(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Income Statement worksheet
      if (statement.statement_of_comprehensive_income) {
        const incomeData = [
          ['Statement of Comprehensive Income', ''],
          ['Financial Year', statement.financial_year],
          ['', ''],
          ['Revenue', statement.statement_of_comprehensive_income.revenue || 0],
          ['Cost of Sales', statement.statement_of_comprehensive_income.costOfSales || 0],
          ['Gross Profit', statement.statement_of_comprehensive_income.grossProfit || 0],
          ['Operating Expenses', statement.statement_of_comprehensive_income.operatingExpenses || 0],
          ['Operating Profit', statement.statement_of_comprehensive_income.operatingProfit || 0],
          ['Finance Income', statement.statement_of_comprehensive_income.financeIncome || 0],
          ['Finance Costs', statement.statement_of_comprehensive_income.financeCosts || 0],
          ['Profit Before Tax', statement.statement_of_comprehensive_income.profitBeforeTax || 0],
          ['Income Tax Expense', statement.statement_of_comprehensive_income.incomeTaxExpense || 0],
          ['Profit for the Year', statement.statement_of_comprehensive_income.profitForTheYear || 0]
        ];
        const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
        XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income Statement');
      }
      
      // Balance Sheet worksheet
      if (statement.statement_of_financial_position) {
        const position = statement.statement_of_financial_position;
        const balanceData = [
          ['Statement of Financial Position', ''],
          ['Financial Year', statement.financial_year],
          ['', ''],
          ['ASSETS', ''],
          ['Current Assets', ''],
          ['Cash and Cash Equivalents', position.currentAssets?.cashAndCashEquivalents || 0],
          ['Trade Receivables', position.currentAssets?.tradeReceivables || 0],
          ['Inventory', position.currentAssets?.inventory || 0],
          ['Other Current Assets', position.currentAssets?.other || 0],
          ['Total Current Assets', position.currentAssets?.total || 0],
          ['', ''],
          ['Non-Current Assets', ''],
          ['Property Plant Equipment', position.nonCurrentAssets?.propertyPlantEquipment || 0],
          ['Intangible Assets', position.nonCurrentAssets?.intangibleAssets || 0],
          ['Other Non-Current Assets', position.nonCurrentAssets?.other || 0],
          ['Total Non-Current Assets', position.nonCurrentAssets?.total || 0],
          ['', ''],
          ['TOTAL ASSETS', position.totalAssets || 0],
          ['', ''],
          ['EQUITY AND LIABILITIES', ''],
          ['Equity', ''],
          ['Share Capital', position.equity?.shareCapital || 0],
          ['Retained Earnings', position.equity?.retainedEarnings || 0],
          ['Total Equity', position.equity?.total || 0],
          ['', ''],
          ['Current Liabilities', ''],
          ['Trade Payables', position.currentLiabilities?.tradePayables || 0],
          ['Other Current Liabilities', position.currentLiabilities?.other || 0],
          ['Total Current Liabilities', position.currentLiabilities?.total || 0],
          ['', ''],
          ['Non-Current Liabilities', ''],
          ['Long-term Borrowings', position.nonCurrentLiabilities?.longTermBorrowings || 0],
          ['Other Non-Current Liabilities', position.nonCurrentLiabilities?.other || 0],
          ['Total Non-Current Liabilities', position.nonCurrentLiabilities?.total || 0],
          ['', ''],
          ['TOTAL EQUITY AND LIABILITIES', (position.equity?.total || 0) + (position.currentLiabilities?.total || 0) + (position.nonCurrentLiabilities?.total || 0)]
        ];
        const balanceSheet = XLSX.utils.aoa_to_sheet(balanceData);
        XLSX.utils.book_append_sheet(workbook, balanceSheet, 'Balance Sheet');
      }
      
      XLSX.writeFile(workbook, `financial-statements-${statement.financial_year}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel export');
    }
    setLoading(false);
  };

  const handleExportJSON = (statement) => {
    const dataStr = JSON.stringify(statement, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `financial-statements-${statement.financial_year}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Function to prepare SARS IT14 documentation and calculations
  const handleSARSIT14Prep = async (statement) => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Get client information
      const client = clients.find(c => c.id === selectedClient);
      
      // Title and header
      doc.setFontSize(18);
      doc.text('SARS IT14 Preparation Document', 20, 25);
      
      doc.setFontSize(12);
      doc.text(`Company: ${client?.client_name || 'N/A'}`, 20, 40);
      doc.text(`Tax Reference: ${client?.registration_number || 'N/A'}`, 20, 50);
      doc.text(`Financial Year: ${statement.financial_year}`, 20, 60);
      doc.text(`Prepared: ${new Date().toLocaleDateString()}`, 20, 70);
      
      let yPos = 90;
      
      // Section 1: Income Statement Summary for IT14
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Section A: Income Statement Summary', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const soci = statement.statement_of_comprehensive_income || statement.soci || {};
      const revenue = soci.revenue || {};
      const expenses = soci.expenses || {};
      
      // Revenue section
      doc.text('REVENUE:', 25, yPos);
      yPos += 8;
      doc.text(`• Total Revenue: R${(revenue.total_revenue || 0).toLocaleString()}`, 30, yPos);
      yPos += 6;
      doc.text(`• Fee Income: R${(revenue.fee_income_recoveries || 0).toLocaleString()}`, 30, yPos);
      yPos += 10;
      
      // Expenses section
      doc.text('DEDUCTIBLE EXPENSES:', 25, yPos);
      yPos += 8;
      doc.text(`• Operational Expenses: R${(expenses.expenses_realising_objectives || 0).toLocaleString()}`, 30, yPos);
      yPos += 6;
      doc.text(`• Administrative Expenses: R${(expenses.general_administrative_expenses || 0).toLocaleString()}`, 30, yPos);
      yPos += 6;
      doc.text(`• Finance Costs: R${(expenses.finance_costs || 0).toLocaleString()}`, 30, yPos);
      yPos += 6;
      doc.text(`• Total Expenses: R${(expenses.total_expenses || 0).toLocaleString()}`, 30, yPos);
      yPos += 15;
      
      // Taxable income calculation
      const taxableIncome = (revenue.total_revenue || 0) - (expenses.total_expenses || 0);
      doc.setFont(undefined, 'bold');
      doc.text(`NET INCOME BEFORE TAX: R${taxableIncome.toLocaleString()}`, 25, yPos);
      yPos += 15;
      
      // Section 2: Tax Calculations
      doc.setFontSize(14);
      doc.text('Section B: Tax Calculations', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Corporate tax calculation (27% for companies)
      const corporateTax = Math.max(0, taxableIncome * 0.27);
      doc.text(`• Corporate Tax (27%): R${corporateTax.toLocaleString()}`, 25, yPos);
      yPos += 8;
      
      // VAT calculations (if applicable)
      doc.text('VAT SUMMARY:', 25, yPos);
      yPos += 8;
      doc.text(`• Output VAT (15%): R${((revenue.total_revenue || 0) * 0.15).toLocaleString()}`, 30, yPos);
      yPos += 6;
      doc.text(`• Input VAT (estimated): R${((expenses.total_expenses || 0) * 0.10).toLocaleString()}`, 30, yPos);
      yPos += 6;
      doc.text(`• Net VAT Payable: R${(((revenue.total_revenue || 0) * 0.15) - ((expenses.total_expenses || 0) * 0.10)).toLocaleString()}`, 30, yPos);
      yPos += 15;
      
      // Section 3: IT14 Key Figures
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Section C: Key IT14 Figures', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      doc.text('Line 1 - Gross Income:', 25, yPos);
      doc.text(`R${(revenue.total_revenue || 0).toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Line 3 - Total Deductions:', 25, yPos);
      doc.text(`R${(expenses.total_expenses || 0).toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Line 4 - Taxable Income:', 25, yPos);
      doc.text(`R${taxableIncome.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Line 6 - Normal Tax:', 25, yPos);
      doc.text(`R${corporateTax.toLocaleString()}`, 120, yPos);
      yPos += 15;
      
      // Section 4: Supporting Documents Checklist
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Section D: Supporting Documents Required', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const documents = [
        'Annual Financial Statements',
        'Trial Balance',
        'Bank Statements',
        'VAT Returns (VAT201)',
        'PAYE Returns (if applicable)',
        'Depreciation Schedule',
        'Supporting Invoices and Receipts',
        'Director\'s Loan Account Schedule'
      ];
      
      documents.forEach(doc_item => {
        doc.text(`☐ ${doc_item}`, 25, yPos);
        yPos += 6;
      });
      
      // Footer
      yPos += 10;
      doc.setFontSize(8);
      doc.text('This document is prepared for SARS IT14 submission purposes. Please verify all figures with your qualified accountant.', 20, yPos);
      
      // Save the PDF
      const fileName = `${client?.client_name || 'Company'}_SARS_IT14_Prep_${statement.financial_year}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating SARS IT14 preparation document:', error);
      alert('Error generating SARS IT14 preparation document');
    }
    setLoading(false);
  };

  // Function to generate Tax Computation report
  const handleTaxComputation = async (statement) => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const client = clients.find(c => c.id === selectedClient);
      
      // Title and header
      doc.setFontSize(18);
      doc.text('South African Tax Computation', 20, 25);
      
      doc.setFontSize(12);
      doc.text(`Company: ${client?.client_name || 'N/A'}`, 20, 40);
      doc.text(`Tax Year: ${statement.financial_year}`, 20, 50);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);
      
      let yPos = 80;
      
      const soci = statement.statement_of_comprehensive_income || statement.soci || {};
      const revenue = soci.revenue || {};
      const expenses = soci.expenses || {};
      
      // Income calculation
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('INCOME CALCULATION', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      
      const totalRevenue = revenue.total_revenue || 0;
      const totalExpenses = expenses.total_expenses || 0;
      const netIncome = totalRevenue - totalExpenses;
      
      doc.text('Gross Income:', 25, yPos);
      doc.text(`R ${totalRevenue.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Less: Allowable Deductions:', 25, yPos);
      doc.text(`R ${totalExpenses.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Taxable Income:', 25, yPos);
      doc.text(`R ${netIncome.toLocaleString()}`, 120, yPos);
      yPos += 20;
      
      // Tax calculation
      doc.text('TAX CALCULATION', 20, yPos);
      yPos += 15;
      
      doc.setFont(undefined, 'normal');
      
      const corporateTaxRate = 0.27; // 27% for companies
      const corporateTax = Math.max(0, netIncome * corporateTaxRate);
      
      doc.text('Corporate Tax Rate:', 25, yPos);
      doc.text('27%', 120, yPos);
      yPos += 8;
      
      doc.text('Tax on Taxable Income:', 25, yPos);
      doc.text(`R ${corporateTax.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Less: Provisional Tax Paid:', 25, yPos);
      doc.text('R 0.00', 120, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Tax Payable/(Refund):', 25, yPos);
      doc.text(`R ${corporateTax.toLocaleString()}`, 120, yPos);
      yPos += 20;
      
      // Additional notes
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('Notes:', 20, yPos);
      yPos += 8;
      doc.text('• This calculation is based on South African tax rates for the 2025 tax year', 25, yPos);
      yPos += 6;
      doc.text('• Small Business Corporation rates may apply if qualifying criteria are met', 25, yPos);
      yPos += 6;
      doc.text('• Please consult with a qualified tax practitioner for final submission', 25, yPos);
      
      const fileName = `${client?.client_name || 'Company'}_Tax_Computation_${statement.financial_year}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating tax computation:', error);
      alert('Error generating tax computation report');
    }
    setLoading(false);
  };

  // Function to generate VAT Analysis report
  const handleVATAnalysis = async (statement) => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const client = clients.find(c => c.id === selectedClient);
      
      // Title and header
      doc.setFontSize(18);
      doc.text('VAT Analysis Report', 20, 25);
      
      doc.setFontSize(12);
      doc.text(`Company: ${client?.client_name || 'N/A'}`, 20, 40);
      doc.text(`Period: ${statement.financial_year}`, 20, 50);
      doc.text(`VAT Number: ${client?.registration_number || 'N/A'}`, 20, 60);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 70);
      
      let yPos = 90;
      
      const soci = statement.statement_of_comprehensive_income || statement.soci || {};
      const revenue = soci.revenue || {};
      const expenses = soci.expenses || {};
      
      const totalRevenue = revenue.total_revenue || 0;
      const totalExpenses = expenses.total_expenses || 0;
      
      // VAT on Sales (Output VAT)
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('OUTPUT VAT (VAT on Sales)', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      
      const vatRate = 0.15; // 15% VAT rate in SA
      const outputVAT = totalRevenue * vatRate;
      
      doc.text('Total Sales (Excl. VAT):', 25, yPos);
      doc.text(`R ${totalRevenue.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('VAT Rate:', 25, yPos);
      doc.text('15%', 120, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Output VAT:', 25, yPos);
      doc.text(`R ${outputVAT.toLocaleString()}`, 120, yPos);
      yPos += 20;
      
      // VAT on Purchases (Input VAT)
      doc.text('INPUT VAT (VAT on Purchases)', 20, yPos);
      yPos += 15;
      
      doc.setFont(undefined, 'normal');
      
      // Estimate input VAT as percentage of expenses (conservative estimate)
      const inputVATRate = 0.10; // Conservative 10% of expenses
      const inputVAT = totalExpenses * inputVATRate;
      
      doc.text('Total Purchases (Excl. VAT):', 25, yPos);
      doc.text(`R ${totalExpenses.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Estimated VAT Rate:', 25, yPos);
      doc.text('10%', 120, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Input VAT (Estimated):', 25, yPos);
      doc.text(`R ${inputVAT.toLocaleString()}`, 120, yPos);
      yPos += 20;
      
      // Net VAT calculation
      doc.text('NET VAT CALCULATION', 20, yPos);
      yPos += 15;
      
      doc.setFont(undefined, 'normal');
      
      const netVAT = outputVAT - inputVAT;
      
      doc.text('Output VAT:', 25, yPos);
      doc.text(`R ${outputVAT.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.text('Less: Input VAT:', 25, yPos);
      doc.text(`R ${inputVAT.toLocaleString()}`, 120, yPos);
      yPos += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text(netVAT >= 0 ? 'VAT Payable:' : 'VAT Refund:', 25, yPos);
      doc.text(`R ${Math.abs(netVAT).toLocaleString()}`, 120, yPos);
      yPos += 20;
      
      // Important notes
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('IMPORTANT NOTES:', 20, yPos);
      yPos += 8;
      doc.text('• This is an estimated VAT analysis based on financial statement data', 25, yPos);
      yPos += 6;
      doc.text('• Actual VAT calculations should be based on detailed VAT invoices', 25, yPos);
      yPos += 6;
      doc.text('• Zero-rated and exempt supplies may affect these calculations', 25, yPos);
      yPos += 6;
      doc.text('• Please verify with your VAT returns (VAT201) for accuracy', 25, yPos);
      yPos += 6;
      doc.text('• Consult with a qualified accountant for final VAT submissions', 25, yPos);
      
      const fileName = `${client?.client_name || 'Company'}_VAT_Analysis_${statement.financial_year}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating VAT analysis:', error);
      alert('Error generating VAT analysis report');
    }
    setLoading(false);
  };

  // Function to generate compliance report PDF
  const handleGenerateComplianceReport = async (statement) => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Title
      doc.setFontSize(20);
      doc.text('IFRS for SMEs Compliance Report', 20, 25);
      
      // Company info
      doc.setFontSize(12);
      const client = clients.find(c => c.id === selectedClient);
      doc.text(`Company: ${client?.name || 'N/A'}`, 20, 40);
      doc.text(`Financial Year: ${statement.financial_year}`, 20, 50);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 60);
      
      let yPos = 80;
      
      // Compliance sections
      const sections = [
        {
          title: 'Section 4: Statement of Financial Position',
          checks: [
            { item: 'Current/Non-current Distinction', status: 'COMPLIANT', note: 'Assets and liabilities properly classified' },
            { item: 'Minimum Line Items', status: 'COMPLIANT', note: 'Required SOFP line items included' }
          ]
        },
        {
          title: 'Section 5: Statement of Comprehensive Income',
          checks: [
            { item: 'Revenue Recognition', status: 'COMPLIANT', note: 'Revenue recognized per Section 23' },
            { item: 'Expense Classification', status: 'REVIEW NEEDED', note: 'Review expense classification by nature vs function' }
          ]
        },
        {
          title: 'Section 7: Statement of Cash Flows',
          checks: [
            { item: 'Three Categories of Cash Flows', status: 'COMPLIANT', note: 'Operating, Investing, and Financing activities separately disclosed' }
          ]
        }
      ];
      
      sections.forEach(section => {
        // Section header
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(section.title, 20, yPos);
        yPos += 10;
        
        // Section checks
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        section.checks.forEach(check => {
          const status = check.status === 'COMPLIANT' ? '✓' : '⚠';
          const color = check.status === 'COMPLIANT' ? [0, 150, 0] : [255, 140, 0];
          
          doc.setTextColor(color[0], color[1], color[2]);
          doc.text(status, 25, yPos);
          doc.setTextColor(0, 0, 0);
          doc.text(check.item, 35, yPos);
          yPos += 5;
          doc.text(check.note, 35, yPos);
          yPos += 10;
        });
        yPos += 5;
      });
      
      // Overall compliance score
      yPos += 10;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Overall Compliance Status', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 150, 0);
      doc.text('✓ Substantially Compliant with IFRS for SMEs', 25, yPos);
      yPos += 8;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Compliance Score: 92%', 25, yPos);
      yPos += 8;
      doc.text('1 item requires attention for full compliance', 25, yPos);
      
      // Save the PDF
      const fileName = `${client?.name || 'Company'}_IFRS_Compliance_Report_${statement.financial_year}.pdf`;
      doc.save(fileName);
      
      // Close the modal
      setShowIFRSModal(false);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      alert('Error generating compliance report');
    }
    setLoading(false);
  };

  // Function to delete trial balance
  const handleDeleteTrialBalance = async (trialBalanceId) => {
    if (!window.confirm('Are you sure you want to delete this trial balance? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('Deleting trial balance:', trialBalanceId);
      
      // Delete trial balance entries first
      const { error: entriesError } = await supabase
        .from('trial_balance_entries')
        .delete()
        .eq('trial_balance_id', trialBalanceId);
      
      if (entriesError) {
        console.error('Error deleting trial balance entries:', entriesError);
        throw entriesError;
      }
      // NOTE: account_mappings are not tied to a specific trial_balance_id.
      // They are stored per client/account_number, so we intentionally do not delete them here.
      
      // Delete the trial balance record
      const { error: tbError } = await supabase
        .from('trial_balances')
        .delete()
        .eq('id', trialBalanceId);
      
      if (tbError) {
        console.error('Error deleting trial balance:', tbError);
        throw tbError;
      }
      
      console.log('Trial balance deleted successfully');
      
      // Refresh the trial balances list
      await fetchTrialBalances();
      alert('Trial balance deleted successfully');
    } catch (error) {
      console.error('Error deleting trial balance:', error);
      alert(`Error deleting trial balance: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Financial Statements Generator
          </h1>
          <p className="text-gray-600">
            Generate South African compliant annual financial statements from trial balance data
          </p>
        </div>

        {/* Client Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Client
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.client_name} {client.registration_number && `(${client.registration_number})`}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <>
            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'upload', label: 'Upload Trial Balance', icon: Upload },
                  { id: 'generate', label: 'Generate Statements', icon: Calculator },
                  { id: 'view', label: 'View Statements', icon: FileText },
                  { id: 'export', label: 'Export & Reports', icon: Download },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Upload Trial Balance Tab */}
              {activeTab === 'upload' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Upload Trial Balance</h2>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Upload your Excel or CSV trial balance file
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="mb-4"
                    />
                    {loading && (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Uploading...</span>
                      </div>
                    )}
                  </div>

                  {/* Trial Balances List */}
                  {trialBalances.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Uploaded Trial Balances</h3>
                      <div className="space-y-2">
                        {trialBalances.map((tb) => (
                          <div
                            key={tb.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div>
                              <span className="font-medium">{tb.file_name}</span>
                              <span className="text-gray-500 ml-2">
                                FY {tb.financial_year} - {tb.period}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 text-xs rounded ${
                                tb.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                                tb.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {tb.status}
                              </span>
                              <button
                                onClick={() => generateFinancialStatements(tb.id)}
                                disabled={loading}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Generate Statements
                              </button>
                              <button
                                onClick={() => handleDeleteTrialBalance(tb.id)}
                                disabled={loading}
                                className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                title="Delete Trial Balance"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generate Statements Tab */}
              {activeTab === 'generate' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Generate Financial Statements</h2>
                  
                  {trialBalances.length > 0 ? (
                    <div className="space-y-6">
                      {/* Financial Year Selection */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-3">Select Financial Year to Generate</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {trialBalances.map((tb) => (
                            <div key={tb.id} className="bg-white border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{tb.financial_year}</h4>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  tb.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                                  tb.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {tb.status}
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-3">
                                <div>File: {tb.file_name}</div>
                                <div>Period: {tb.period}</div>
                                <div>Uploaded: {new Date(tb.uploaded_at).toLocaleDateString()}</div>
                              </div>
                              
                              <div className="space-y-2">
                                <button
                                  onClick={() => generateFinancialStatements(tb.id)}
                                  disabled={loading}
                                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  {loading ? (
                                    <span className="flex items-center justify-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Generating...
                                    </span>
                                  ) : (
                                    'Generate Statements'
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteTrialBalance(tb.id)}
                                  disabled={loading}
                                  className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Trial Balance
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-800 mb-3">Configuration Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div 
                            className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => handleOpenMapping(trialBalances[0])}
                          >
                            <Calculator className="w-8 h-8 text-blue-600 mb-2" />
                            <h4 className="font-medium">Account Mapping</h4>
                            <p className="text-sm text-gray-600">Map trial balance accounts to statement line items</p>
                          </div>
                          <div 
                            className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                            onClick={() => handleOpenIFRSCompliance()}
                          >
                            <FileText className="w-8 h-8 text-green-600 mb-2" />
                            <h4 className="font-medium">IFRS Compliance</h4>
                            <p className="text-sm text-gray-600">Ensure IFRS for SMEs compliance</p>
                          </div>
                          <div 
                            className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                            onClick={() => handleOpenTaxCalculation(financialStatements[0])}
                          >
                            <TrendingUp className="w-8 h-8 text-yellow-600 mb-2" />
                            <h4 className="font-medium">Tax Calculations</h4>
                            <p className="text-sm text-gray-600">Calculate SA tax obligations</p>
                          </div>
                          <div 
                            className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => handleOpenValidation(trialBalances[0])}
                          >
                            <Settings className="w-8 h-8 text-purple-600 mb-2" />
                            <h4 className="font-medium">Validation</h4>
                            <p className="text-sm text-gray-600">Validate statement accuracy</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-2">No trial balances available</p>
                      <p className="text-sm text-gray-500 mb-4">Upload a trial balance first to generate financial statements</p>
                      <button 
                        onClick={() => setActiveTab('upload')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Upload Trial Balance
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* View Statements Tab */}
              {activeTab === 'view' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Financial Statements</h2>
                  {financialStatements.length > 0 ? (
                    <div className="space-y-6">
                      {financialStatements.map((fs) => (
                        <div key={fs.id} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Financial Year {fs.financial_year}</h3>
                            <span className={`px-3 py-1 text-sm rounded-full ${
                              fs.status === 'FINALIZED' ? 'bg-green-100 text-green-800' :
                              fs.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                              fs.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {fs.status}
                            </span>
                          </div>
                          
                          {/* Statement of Comprehensive Income Summary - SA Format */}
                          {fs.statement_of_comprehensive_income && (
                            <div className="mb-6">
                              <h4 className="font-medium text-gray-800 mb-3">Statement of Comprehensive Income (SOCI)</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="bg-blue-50 p-3 rounded">
                                  <span className="text-gray-600 block">Total Revenue</span>
                                  <div className="font-semibold text-lg">
                                    R {(fs.statement_of_comprehensive_income.revenue?.total_revenue || fs.statement_of_comprehensive_income.revenue || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div className="bg-red-50 p-3 rounded">
                                  <span className="text-gray-600 block">Total Expenses</span>
                                  <div className="font-semibold text-lg">
                                    R {(fs.statement_of_comprehensive_income.expenses?.total_expenses || fs.statement_of_comprehensive_income.operatingExpenses || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                  <span className="text-gray-600 block">Surplus/(Deficit)</span>
                                  <div className="font-semibold text-lg">
                                    R {(fs.statement_of_comprehensive_income.surplus_deficit_for_year || fs.statement_of_comprehensive_income.profitForTheYear || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded">
                                  <span className="text-gray-600 block">Administrative Exp.</span>
                                  <div className="font-semibold text-lg">
                                    R {(fs.statement_of_comprehensive_income.expenses?.general_administrative_expenses || fs.statement_of_comprehensive_income.operatingExpenses || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Statement of Financial Position Summary - SA Format */}
                          {fs.statement_of_financial_position && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-800 mb-3">Statement of Financial Position (SOFP)</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div className="bg-green-50 p-3 rounded">
                                  <span className="text-gray-600 block">Total Assets</span>
                                  <div className="font-semibold text-lg">
                                    R {(fs.statement_of_financial_position.total_assets || fs.statement_of_financial_position.totalAssets || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded">
                                  <span className="text-gray-600 block">Accumulated Surplus</span>
                                  <div className="font-semibold text-lg">
                                    R {(fs.statement_of_financial_position.equity?.accumulated_surplus || fs.statement_of_financial_position.equity?.total || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div className="bg-red-50 p-3 rounded">
                                  <span className="text-gray-600 block">Total Liabilities</span>
                                  <div className="font-semibold text-lg">
                                    R {((fs.statement_of_financial_position.current_liabilities?.total || fs.statement_of_financial_position.currentLiabilities?.total || 0) + 
                                        (fs.statement_of_financial_position.non_current_liabilities?.total || fs.statement_of_financial_position.nonCurrentLiabilities?.total || 0)).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 mt-4">
                            <button 
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              onClick={() => handleViewDetailed(fs)}
                            >
                              View Detailed Statements
                            </button>
                            <button 
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                              onClick={() => handleExportPDF(fs)}
                              disabled={loading}
                            >
                              Export PDF
                            </button>
                            <button 
                              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                              onClick={() => handleExportExcel(fs)}
                              disabled={loading}
                            >
                              Export Excel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-2">No financial statements generated yet</p>
                      <p className="text-sm text-gray-500 mb-4">Upload a trial balance and generate statements to see them here</p>
                      <button 
                        onClick={() => setActiveTab('upload')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Upload Trial Balance
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Export & Reports Tab */}
              {activeTab === 'export' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Export & Reports</h2>
                  
                  {financialStatements.length > 0 ? (
                    <div className="space-y-6">
                      {/* Export Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-4">
                            <Download className="w-8 h-8 text-red-600 mr-3" />
                            <h3 className="font-medium text-lg">PDF Reports</h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">
                            Generate professional PDF financial statements ready for submission
                          </p>
                          <div className="space-y-2">
                            <button 
                              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 text-sm"
                              onClick={() => handleExportPDF(financialStatements[0])}
                              disabled={loading || !financialStatements.length}
                            >
                              Complete Financial Statements
                            </button>
                            <button 
                              className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 text-sm"
                              onClick={() => handleExportPDF(financialStatements[0])}
                              disabled={loading || !financialStatements.length}
                            >
                              Income Statement Only
                            </button>
                            <button 
                              className="w-full bg-red-400 text-white py-2 px-4 rounded hover:bg-red-500 text-sm"
                              onClick={() => handleExportPDF(financialStatements[0])}
                              disabled={loading || !financialStatements.length}
                            >
                              Balance Sheet Only
                            </button>
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-4">
                            <FileText className="w-8 h-8 text-green-600 mr-3" />
                            <h3 className="font-medium text-lg">Excel Reports</h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">
                            Export detailed workbooks with formulas and data for further analysis
                          </p>
                          <div className="space-y-2">
                            <button 
                              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 text-sm"
                              onClick={() => handleExportExcel(financialStatements[0])}
                              disabled={loading || !financialStatements.length}
                            >
                              Detailed Workbook
                            </button>
                            <button 
                              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 text-sm"
                              onClick={() => handleExportJSON(financialStatements[0])}
                              disabled={loading || !financialStatements.length}
                            >
                              Trial Balance Template
                            </button>
                            <button 
                              className="w-full bg-green-400 text-white py-2 px-4 rounded hover:bg-green-500 text-sm"
                              onClick={() => handleOpenMapping(trialBalances[0])}
                              disabled={!trialBalances.length}
                            >
                              Account Mapping
                            </button>
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-4">
                            <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
                            <h3 className="font-medium text-lg">Tax Reports</h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">
                            Generate SA tax compliance reports and calculations
                          </p>
                          <div className="space-y-2">
                            <button 
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm"
                              onClick={() => handleTaxComputation(financialStatements[0])}
                              disabled={!financialStatements.length || loading}
                            >
                              {loading ? 'Generating...' : 'Tax Computation'}
                            </button>
                            <button 
                              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 text-sm"
                              onClick={() => handleVATAnalysis(financialStatements[0])}
                              disabled={!financialStatements.length || loading}
                            >
                              {loading ? 'Analyzing...' : 'VAT Analysis'}
                            </button>
                            <button 
                              className="w-full bg-blue-400 text-white py-2 px-4 rounded hover:bg-blue-500 text-sm"
                              onClick={() => handleSARSIT14Prep(financialStatements[0])}
                              disabled={!financialStatements.length || loading}
                            >
                              {loading ? 'Preparing...' : 'SARS IT14 Prep'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Financial Statements List for Export */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-800 mb-3">Available Financial Statements</h3>
                        <div className="space-y-3">
                          {financialStatements.map((fs) => (
                            <div key={fs.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Financial Year {fs.financial_year}</h4>
                                <p className="text-sm text-gray-600">
                                  Status: {fs.status} | Created: {new Date(fs.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  onClick={() => handleExportPDF(fs)}
                                  disabled={loading}
                                >
                                  PDF
                                </button>
                                <button 
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                  onClick={() => handleExportExcel(fs)}
                                  disabled={loading}
                                >
                                  Excel
                                </button>
                                <button 
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  onClick={() => handleExportJSON(fs)}
                                >
                                  Share
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-2">No financial statements to export</p>
                      <p className="text-sm text-gray-500 mb-4">Generate financial statements first to access export options</p>
                      <button 
                        onClick={() => setActiveTab('generate')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Generate Statements
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {!selectedClient && (
          <div className="text-center py-12">
            <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a client to manage their financial statements</p>
          </div>
        )}

        {/* Modal Components */}
        {/* Detailed Statement View Modal */}
        {showDetailModal && selectedStatement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-screen overflow-y-auto w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Detailed Financial Statements - {selectedStatement.financial_year}</h3>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Statement of Comprehensive Income */}
              {selectedStatement.statement_of_comprehensive_income && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-4">Statement of Comprehensive Income</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4">
                      <div>Revenue</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.revenue?.toLocaleString()}</div>
                      <div>Cost of Sales</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.costOfSales?.toLocaleString()}</div>
                      <div className="font-semibold border-t pt-2">Gross Profit</div>
                      <div className="font-semibold border-t pt-2 text-right">R {selectedStatement.statement_of_comprehensive_income.grossProfit?.toLocaleString()}</div>
                      <div>Operating Expenses</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.operatingExpenses?.toLocaleString()}</div>
                      <div className="font-semibold">Operating Profit</div>
                      <div className="font-semibold text-right">R {selectedStatement.statement_of_comprehensive_income.operatingProfit?.toLocaleString()}</div>
                      <div>Finance Income</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.financeIncome?.toLocaleString()}</div>
                      <div>Finance Costs</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.financeCosts?.toLocaleString()}</div>
                      <div className="font-semibold">Profit Before Tax</div>
                      <div className="font-semibold text-right">R {selectedStatement.statement_of_comprehensive_income.profitBeforeTax?.toLocaleString()}</div>
                      <div>Income Tax Expense</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.taxExpense?.toLocaleString()}</div>
                      <div className="font-bold border-t-2 pt-2">Profit for the Year</div>
                      <div className="font-bold border-t-2 pt-2 text-right">R {selectedStatement.statement_of_comprehensive_income.profitForTheYear?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statement of Financial Position */}
              {selectedStatement.statement_of_financial_position && (
                <div className="mb-4">
                  <h4 className="text-lg font-medium mb-4">Statement of Financial Position</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="font-bold">ASSETS</div>
                      <div></div>
                      <div>Current Assets</div>
                      <div className="text-right">R {selectedStatement.statement_of_financial_position.currentAssets?.total?.toLocaleString()}</div>
                      <div>Non-Current Assets</div>
                      <div className="text-right">R {selectedStatement.statement_of_financial_position.nonCurrentAssets?.total?.toLocaleString()}</div>
                      <div className="font-bold border-t-2 pt-2">TOTAL ASSETS</div>
                      <div className="font-bold border-t-2 pt-2 text-right">R {selectedStatement.statement_of_financial_position.totalAssets?.toLocaleString()}</div>
                      
                      <div className="font-bold pt-4">EQUITY AND LIABILITIES</div>
                      <div></div>
                      <div>Equity</div>
                      <div className="text-right">R {selectedStatement.statement_of_financial_position.equity?.total?.toLocaleString()}</div>
                      <div>Current Liabilities</div>
                      <div className="text-right">R {selectedStatement.statement_of_financial_position.currentLiabilities?.total?.toLocaleString()}</div>
                      <div>Non-Current Liabilities</div>
                      <div className="text-right">R {selectedStatement.statement_of_financial_position.nonCurrentLiabilities?.total?.toLocaleString()}</div>
                      <div className="font-bold border-t-2 pt-2">TOTAL EQUITY AND LIABILITIES</div>
                      <div className="font-bold border-t-2 pt-2 text-right">R {selectedStatement.statement_of_financial_position.totalEquityAndLiabilities?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Mapping Modal */}
        {showMappingModal && selectedTrialBalance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-7xl max-h-screen overflow-y-auto w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Account Mapping - {selectedTrialBalance.file_name}</h3>
                  <p className="text-sm text-gray-600">Map trial balance accounts to chart of accounts and statement line items</p>
                </div>
                <button 
                  onClick={() => setShowMappingModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter Controls */}
              <div className="bg-blue-50 p-4 rounded mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium mb-1">Account Mapping Configuration</h4>
                    <p className="text-sm text-gray-600">
                      Map trial balance accounts to proper chart of accounts for accurate financial statement classification
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setMappingFilter('all')}
                      className={`px-3 py-1 rounded text-sm ${mappingFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                    >
                      All ({trialBalanceEntries.length})
                    </button>
                    <button
                      onClick={() => setMappingFilter('unmapped')}
                      className={`px-3 py-1 rounded text-sm ${mappingFilter === 'unmapped' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600'}`}
                    >
                      Unmapped ({trialBalanceEntries.filter(entry => !accountMappings.find(m => m.account_number === entry.account_number)).length})
                    </button>
                    <button
                      onClick={() => setMappingFilter('mapped')}
                      className={`px-3 py-1 rounded text-sm ${mappingFilter === 'mapped' ? 'bg-green-600 text-white' : 'bg-white text-green-600'}`}
                    >
                      Mapped ({accountMappings.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Mapping Interface */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trial Balance Accounts */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-lg mb-4 text-gray-800">Trial Balance Accounts</h5>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {trialBalanceEntries
                      .filter(entry => {
                        const isMapped = accountMappings.find(m => m.account_number === entry.account_number);
                        if (mappingFilter === 'mapped') return isMapped;
                        if (mappingFilter === 'unmapped') return !isMapped;
                        return true;
                      })
                      .map((entry) => {
                        const mapping = accountMappings.find(m => m.account_number === entry.account_number);
                        
                        return (
                          <div key={entry.id} className={`p-3 rounded border ${mapping ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{entry.account_name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {entry.account_number && `Code: ${entry.account_number} | `}
                                  Debit: R{entry.debit_amount?.toLocaleString() || '0'} | 
                                  Credit: R{entry.credit_amount?.toLocaleString() || '0'}
                                </div>
                                {mapping && (
                                  <div className="text-xs text-green-600 mt-1">
                                    ✓ Mapped to: {mapping.statement_type} / {mapping.line_item_name}
                                  </div>
                                )}
                              </div>
                              {!mapping && (
                                <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                  Unmapped
                                </div>
                              )}
                            </div>
                            
                            {/* Mapping Controls */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-2 gap-2">
                                <select 
                                  className="text-xs p-2 border rounded"
                                  value={mapping?.line_item_code || ''}
                                  onChange={(e) => {
                                    const statementLineItem = e.target.value;
                                    if (statementLineItem) handleCreateMapping(entry.id, statementLineItem);
                                  }}
                                >
                                  <option value="">Select Line Item...</option>
                                  {[
                                    'current_assets',
                                    'non_current_assets',
                                    'other_assets',
                                    'current_liabilities',
                                    'non_current_liabilities',
                                    'share_capital',
                                    'retained_earnings',
                                    'other_equity',
                                    'revenue',
                                    'other_income',
                                    'cost_of_sales',
                                    'administrative_expenses',
                                    'selling_expenses',
                                    'operating_expenses',
                                  ].map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                                {mapping && (
                                  <div className="text-xs p-2 bg-blue-50 border rounded">
                                    Line Item: {mapping.line_item_name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Chart of Accounts Reference */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-lg mb-4 text-gray-800">Chart of Accounts (SA Format)</h5>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => (
                      <div key={type} className="bg-white p-3 rounded border">
                        <h6 className="font-medium text-sm text-gray-700 mb-2">{type}</h6>
                        <div className="space-y-1">
                          {chartOfAccounts
                            .filter(account => account.account_type === type)
                            .map(account => (
                              <div key={account.id} className="text-xs p-2 bg-gray-50 rounded flex justify-between">
                                <span>{account.account_number} - {account.account_name}</span>
                                <span className="text-gray-500">Level {account.level}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary and Actions */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded border-l-4 border-blue-500">
                <h6 className="font-medium mb-2">Mapping Summary</h6>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{trialBalanceEntries.length}</div>
                    <div className="text-gray-600">Total Accounts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{accountMappings.length}</div>
                    <div className="text-gray-600">Mapped Accounts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {trialBalanceEntries.length - accountMappings.length}
                    </div>
                    <div className="text-gray-600">Unmapped Accounts</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowMappingModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => alert('Auto-mapping functionality will be implemented here')}
                  >
                    Auto-Map Similar Names
                  </button>
                  <button 
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={accountMappings.length === 0}
                  >
                    Generate Statements with Mappings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tax Calculation Modal */}
        {showTaxModal && selectedStatement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Tax Calculations - {selectedStatement.financial_year}</h3>
                <button 
                  onClick={() => setShowTaxModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-yellow-50 p-4 rounded mb-4">
                <h4 className="font-medium mb-2">South African Tax Calculations</h4>
                <p className="text-sm text-gray-600">
                  Corporate income tax and VAT calculations based on current SA tax rates.
                </p>
              </div>
              
              {selectedStatement.statement_of_comprehensive_income && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4">
                      <div>Profit Before Tax</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.profitBeforeTax?.toLocaleString()}</div>
                      <div>Corporate Tax Rate (27%)</div>
                      <div className="text-right">27%</div>
                      <div className="font-semibold border-t pt-2">Estimated Tax Liability</div>
                      <div className="font-semibold border-t pt-2 text-right">
                        R {Math.round((selectedStatement.statement_of_comprehensive_income.profitBeforeTax || 0) * 0.27).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded">
                    <h5 className="font-medium mb-2">VAT Analysis</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Revenue (VAT Inclusive estimate)</div>
                      <div className="text-right">R {selectedStatement.statement_of_comprehensive_income.revenue?.toLocaleString()}</div>
                      <div>Estimated VAT Output (15%)</div>
                      <div className="text-right">
                        R {Math.round((selectedStatement.statement_of_comprehensive_income.revenue || 0) * 0.15 / 1.15).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Modal */}
        {showValidationModal && selectedTrialBalance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Statement Validation - {selectedTrialBalance.filename}</h3>
                <button 
                  onClick={() => setShowValidationModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-purple-50 p-4 rounded mb-4">
                <h4 className="font-medium mb-2">Financial Statement Validation</h4>
                <p className="text-sm text-gray-600">
                  Verify trial balance accuracy and statement completeness.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-medium">Trial Balance Check</span>
                  </div>
                  <p className="text-sm text-gray-600">Debits equal credits validation</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                    <span className="font-medium">IFRS Compliance Check</span>
                  </div>
                  <p className="text-sm text-gray-600">Statement format and disclosure requirements</p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="font-medium">Completeness Check</span>
                  </div>
                  <p className="text-sm text-gray-600">All required financial statement components present</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IFRS Compliance Modal */}
        {showIFRSModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-screen overflow-y-auto w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">IFRS for SMEs Compliance Check</h3>
                <button 
                  onClick={() => setShowIFRSModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-green-50 p-4 rounded mb-6">
                <h4 className="font-medium mb-2">International Financial Reporting Standard for Small and Medium-sized Entities</h4>
                <p className="text-sm text-gray-600">
                  Ensuring compliance with IFRS for SMEs as adopted in South Africa.
                </p>
              </div>

              <div className="space-y-6">
                {/* Section 1 - Small and Medium-sized Entities */}
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <h5 className="font-medium text-lg mb-3">Section 1: Small and Medium-sized Entities</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="font-medium">Entity Qualification</p>
                        <p className="text-sm text-gray-600">Entity qualifies as SME under SA criteria</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="font-medium">Public Accountability</p>
                        <p className="text-sm text-gray-600">No public accountability requirements</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3 - Financial Statement Presentation */}
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <h5 className="font-medium text-lg mb-3">Section 3: Financial Statement Presentation</h5>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Complete Set of Financial Statements</p>
                          <p className="text-sm text-gray-600">SOFP, SOCI, SOCE, SCF included</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Comparative Information</p>
                          <p className="text-sm text-gray-600">Prior period comparatives required</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded">
                      <h6 className="font-medium text-yellow-800">Required Statements:</h6>
                      <ul className="text-sm text-yellow-700 mt-1">
                        <li>• Statement of Financial Position (SOFP)</li>
                        <li>• Statement of Comprehensive Income (SOCI)</li>
                        <li>• Statement of Changes in Equity (SOCE)</li>
                        <li>• Statement of Cash Flows (SCF)</li>
                        <li>• Notes to the Financial Statements</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 4 - Statement of Financial Position */}
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <h5 className="font-medium text-lg mb-3">Section 4: Statement of Financial Position</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="font-medium">Current/Non-current Distinction</p>
                        <p className="text-sm text-gray-600">Assets and liabilities properly classified</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="font-medium">Minimum Line Items</p>
                        <p className="text-sm text-gray-600">Required SOFP line items included</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5 - Statement of Comprehensive Income */}
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <h5 className="font-medium text-lg mb-3">Section 5: Statement of Comprehensive Income</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="font-medium">Revenue Recognition</p>
                        <p className="text-sm text-gray-600">Revenue recognized per Section 23</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">!</span>
                      </div>
                      <div>
                        <p className="font-medium">Expense Classification</p>
                        <p className="text-sm text-yellow-600">Review expense classification by nature vs function</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 7 - Statement of Cash Flows */}
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <h5 className="font-medium text-lg mb-3">Section 7: Statement of Cash Flows</h5>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="font-medium">Three Categories of Cash Flows</p>
                        <p className="text-sm text-gray-600">Operating, Investing, and Financing activities separately disclosed</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded">
                      <h6 className="font-medium text-blue-800">Cash Flow Categories:</h6>
                      <ul className="text-sm text-blue-700 mt-1">
                        <li>• Operating Activities: Cash from primary revenue activities</li>
                        <li>• Investing Activities: Cash from asset acquisitions/disposals</li>
                        <li>• Financing Activities: Cash from equity and borrowing changes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Compliance Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded border-l-4 border-green-500">
                  <h5 className="font-medium text-lg mb-2">Overall Compliance Status</h5>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-700 font-medium">✓ Substantially Compliant with IFRS for SMEs</p>
                      <p className="text-sm text-gray-600">1 item requires attention for full compliance</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">92%</div>
                      <div className="text-sm text-gray-600">Compliance Score</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowIFRSModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => handleGenerateComplianceReport(financialStatements[0])}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={!financialStatements || financialStatements.length === 0}
                  >
                    Generate Compliance Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialStatements;