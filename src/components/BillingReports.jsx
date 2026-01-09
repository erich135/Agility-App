import React, { useState, useEffect, useRef } from 'react';
import { ReportingService, ConsultantService, JobTypeService } from '../services/TimesheetService';
import supabase from '../lib/SupabaseClient';
import dayjs from 'dayjs';

const BillingReports = () => {
  const getEntryJobTypeId = (entry) =>
    entry?.project?.job_type?.id || entry?.project?.job_type_id || entry?.job_type_id || null;

  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
    dateTo: dayjs().endOf('month').format('YYYY-MM-DD'),
    clients: [],
    consultants: [],
    jobTypes: [],
    billableOnly: false,
    projectStatus: '',
    groupBy: 'month', // day, week, month, quarter
    reportType: 'summary' // summary, detailed, client, consultant, jobtype, productivity
  });

  // Data states
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Reference data
  const [clients, setClients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);

  // UI states
  const [activeTab, setActiveTab] = useState('filters');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load reference data on mount
  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [clientsRes, consultantsRes, jobTypesRes] = await Promise.all([
        supabase.from('clients').select('id, client_name').eq('status', 'Active').order('client_name'),
        ConsultantService.getAll(),
        JobTypeService.getAll()
      ]);

      console.log('Reference data loaded:', {
        clients: clientsRes.data?.length,
        consultants: consultantsRes.data?.length,
        jobTypes: jobTypesRes.data?.length,
        consultantsData: consultantsRes.data,
        jobTypesData: jobTypesRes.data
      });

      if (clientsRes.data) {
        setClients(clientsRes.data);
        // Select all clients by default
        setFilters(prev => ({ ...prev, clients: clientsRes.data.map(c => c.id) }));
      }
      if (consultantsRes.data) {
        setConsultants(consultantsRes.data);
        // Select all consultants by default
        setFilters(prev => ({ ...prev, consultants: consultantsRes.data.map(c => c.id) }));
      }
      if (jobTypesRes.data) {
        setJobTypes(jobTypesRes.data);
        // Select all job types by default
        setFilters(prev => ({ ...prev, jobTypes: jobTypesRes.data.map(jt => jt.id) }));
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  // Generate comprehensive report
  const generateReport = async () => {
    setLoading(true);
    try {
      let data = [];

      switch (filters.reportType) {
        case 'summary':
          data = await generateSummaryReport();
          break;
        case 'detailed':
          data = await generateDetailedReport();
          break;
        case 'client':
          data = await generateClientReport();
          break;
        case 'consultant':
          data = await generateConsultantReport();
          break;
        case 'jobtype':
          data = await generateJobTypeReport();
          break;
        case 'productivity':
          data = await generateProductivityReport();
          break;
        default:
          data = await generateSummaryReport();
      }

      setReportData(data);
      setActiveTab('results');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSummaryReport = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, name, status, job_type_id, client:clients(id, client_name)),
        consultant:consultants!consultant_id(id, full_name)
      `)
      .gte('entry_date', filters.dateFrom)
      .lte('entry_date', filters.dateTo)
      .order('entry_date', { ascending: false });

    if (error) throw error;

    console.log('Query returned data:', data?.length, 'entries');
    console.log('First entry sample:', data?.[0]);
    console.log('Active filters:', filters);

    // Apply filters
    let filteredData = data;
    if (filters.clients.length > 0) {
      filteredData = filteredData.filter(entry =>
        filters.clients.includes(entry.project?.client?.id)
      );
      console.log('After client filter:', filteredData.length);
    }
    if (filters.consultants.length > 0) {
      filteredData = filteredData.filter(entry =>
        filters.consultants.includes(entry.consultant_id)
      );
      console.log('After consultant filter:', filteredData.length);
    }
    if (filters.jobTypes.length > 0) {
      filteredData = filteredData.filter(entry =>
        filters.jobTypes.includes(getEntryJobTypeId(entry))
      );
      console.log('After job type filter:', filteredData.length);
    }
    if (filters.billableOnly) {
      filteredData = filteredData.filter(entry => entry.is_billable);
    }
    if (filters.projectStatus) {
      filteredData = filteredData.filter(entry =>
        entry.project?.status === filters.projectStatus
      );
    }

    // Group by selected period
    const grouped = groupByPeriod(filteredData, filters.groupBy);

    return grouped;
  };

  const generateDetailedReport = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, name, status, estimated_hours, total_hours, billing_date, invoice_number, client:clients(id, client_name), job_type:job_types(id, name, category)),
        consultant:consultants!consultant_id(id, full_name, hourly_rate)
      `)
      .gte('entry_date', filters.dateFrom)
      .lte('entry_date', filters.dateTo)
      .order('entry_date', { ascending: false });

    if (error) throw error;

    console.log('Detailed report - Query returned:', data?.length, 'entries');
    console.log('Detailed report - First entry:', data?.[0]);

    // Apply same filters as summary
    let filteredData = data;
    if (filters.clients.length > 0) {
      filteredData = filteredData.filter(entry =>
        filters.clients.includes(entry.project?.client?.id)
      );
      console.log('Detailed - After client filter:', filteredData.length);
    }
    if (filters.consultants.length > 0) {
      filteredData = filteredData.filter(entry =>
        filters.consultants.includes(entry.consultant_id)
      );
      console.log('Detailed - After consultant filter:', filteredData.length);
    }
    if (filters.jobTypes.length > 0) {
      filteredData = filteredData.filter(entry =>
        filters.jobTypes.includes(getEntryJobTypeId(entry))
      );
      console.log('Detailed - After job type filter:', filteredData.length);
    }
    if (filters.billableOnly) {
      filteredData = filteredData.filter(entry => entry.is_billable);
    }
    if (filters.projectStatus) {
      filteredData = filteredData.filter(entry =>
        entry.project?.status === filters.projectStatus
      );
    }

    console.log('Detailed report - Final filtered data:', filteredData.length);
    return filteredData;
  };

  const generateClientReport = async () => {
    const detailedData = await generateDetailedReport();

    // Group by client
    const clientGroups = {};
    detailedData.forEach(entry => {
      const clientId = entry.project?.client?.id || 'unknown';
      const clientName = entry.project?.client?.client_name || 'Unknown Client';

      if (!clientGroups[clientId]) {
        clientGroups[clientId] = {
          clientId,
          clientName,
          totalHours: 0,
          billableHours: 0,
          totalRevenue: 0,
          projects: new Set(),
          consultants: new Set(),
          entries: []
        };
      }

      const group = clientGroups[clientId];
      group.totalHours += entry.duration_hours || 0;
      if (entry.is_billable) {
        group.billableHours += entry.duration_hours || 0;
        group.totalRevenue += (entry.duration_hours || 0) * (entry.hourly_rate || 0);
      }
      group.projects.add(entry.project?.name);
      group.consultants.add(entry.consultant?.full_name);
      group.entries.push(entry);
    });

    return Object.values(clientGroups).map(group => ({
      ...group,
      projectCount: group.projects.size,
      consultantCount: group.consultants.size
    }));
  };

  const generateConsultantReport = async () => {
    const detailedData = await generateDetailedReport();

    // Group by consultant
    const consultantGroups = {};
    detailedData.forEach(entry => {
      const consultantId = entry.consultant_id || 'unknown';
      const consultantName = entry.consultant?.full_name || 'Unknown Consultant';

      if (!consultantGroups[consultantId]) {
        consultantGroups[consultantId] = {
          consultantId,
          consultantName,
          totalHours: 0,
          billableHours: 0,
          totalRevenue: 0,
          clients: new Set(),
          projects: new Set(),
          entries: []
        };
      }

      const group = consultantGroups[consultantId];
      group.totalHours += entry.duration_hours || 0;
      if (entry.is_billable) {
        group.billableHours += entry.duration_hours || 0;
        group.totalRevenue += (entry.duration_hours || 0) * (entry.hourly_rate || 0);
      }
      group.clients.add(entry.project?.client?.client_name);
      group.projects.add(entry.project?.name);
      group.entries.push(entry);
    });

    return Object.values(consultantGroups).map(group => ({
      ...group,
      clientCount: group.clients.size,
      projectCount: group.projects.size
    }));
  };

  const generateJobTypeReport = async () => {
    const detailedData = await generateDetailedReport();

    // Group by job type
    const jobTypeGroups = {};
    detailedData.forEach(entry => {
      const jobTypeId = getEntryJobTypeId(entry) || 'unknown';
      const fallbackJobType = jobTypes.find(jt => jt.id === jobTypeId);
      const jobTypeName = entry.project?.job_type?.name || fallbackJobType?.name || 'Unknown Job Type';
      const category = entry.project?.job_type?.category || fallbackJobType?.category || 'Unknown';

      if (!jobTypeGroups[jobTypeId]) {
        jobTypeGroups[jobTypeId] = {
          jobTypeId,
          jobTypeName,
          category,
          totalHours: 0,
          billableHours: 0,
          totalRevenue: 0,
          entries: []
        };
      }

      const group = jobTypeGroups[jobTypeId];
      group.totalHours += entry.duration_hours || 0;
      if (entry.is_billable) {
        group.billableHours += entry.duration_hours || 0;
        group.totalRevenue += (entry.duration_hours || 0) * (entry.hourly_rate || 0);
      }
      group.entries.push(entry);
    });

    return Object.values(jobTypeGroups);
  };

  const generateProductivityReport = async () => {
    const detailedData = await generateDetailedReport();

    // Group time entries by Consultant
    const consultantEfficiency = {};

    detailedData.forEach(entry => {
      const consultantId = entry.consultant_id || 'unknown';
      const consultantName = entry.consultant?.full_name || 'Unknown Staff';
      
      if (!consultantEfficiency[consultantId]) {
        // MOCK TARGET HOURS: For demo, assigning random targets between 150-180h depending on ID
        // In production, this would come from a 'consultant_targets' table
        const mockTarget = 160; 

        consultantEfficiency[consultantId] = {
          consultantId,
          consultantName,
          totalLoggedHours: 0,
          totalBillableHours: 0,
          targetHours: mockTarget, 
          revenueGenerated: 0,
          projectsWorkedOn: new Set()
        };
      }

      const stats = consultantEfficiency[consultantId];
      stats.totalLoggedHours += Number(entry.duration_hours || 0);
      
      if (entry.is_billable) {
        stats.totalBillableHours += Number(entry.duration_hours || 0);
        stats.revenueGenerated += (Number(entry.duration_hours || 0) * Number(entry.hourly_rate || 0));
      }
      
      if (entry.project?.name) stats.projectsWorkedOn.add(entry.project.name);
    });

    // Calculate Efficiency % (Billable / Target)
    return Object.values(consultantEfficiency).map(staff => ({
      ...staff,
      efficiency: (staff.totalBillableHours / staff.targetHours), // percentage decimal (e.g. 1.1 or 0.8)
      projectCount: staff.projectsWorkedOn.size
    }));
  };

  const groupByPeriod = (data, groupBy) => {
    const groups = {};

    data.forEach(entry => {
      let key;
      const date = dayjs(entry.entry_date);

      switch (groupBy) {
        case 'day':
          key = date.format('YYYY-MM-DD');
          break;
        case 'week':
          const weekStart = date.startOf('week');
          key = weekStart.format('YYYY-MM-DD');
          break;
        case 'month':
          key = date.format('YYYY-MM');
          break;
        case 'quarter':
          const quarter = Math.floor(date.month() / 3) + 1;
          key = `${date.year()}-Q${quarter}`;
          break;
        default:
          key = date.format('YYYY-MM');
      }

      if (!groups[key]) {
        groups[key] = {
          period: key,
          totalHours: 0,
          billableHours: 0,
          totalRevenue: 0,
          entries: []
        };
      }

      const group = groups[key];
      group.totalHours += entry.duration_hours || 0;
      if (entry.is_billable) {
        group.billableHours += entry.duration_hours || 0;
        group.totalRevenue += (entry.duration_hours || 0) * (entry.hourly_rate || 0);
      }
      group.entries.push(entry);
    });

    return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      let csvContent = '';

      switch (filters.reportType) {
        case 'summary':
          csvContent = generateSummaryCSV();
          break;
        case 'detailed':
          csvContent = generateDetailedCSV();
          break;
        case 'client':
          csvContent = generateClientCSV();
          break;
        case 'consultant':
          csvContent = generateConsultantCSV();
          break;
        case 'jobtype':
          csvContent = generateJobTypeCSV();
          break;
        case 'productivity':
          csvContent = generateProductivityCSV();
          break;
        default:
          csvContent = generateSummaryCSV();
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `billing_report_${filters.reportType}_${dayjs().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const generateSummaryCSV = () => {
    let csv = 'Period,Total Hours,Billable Hours,Total Revenue\n';
    reportData.forEach(row => {
      csv += `${row.period},${row.totalHours.toFixed(2)},${row.billableHours.toFixed(2)},${row.totalRevenue.toFixed(2)}\n`;
    });
    return csv;
  };

  const generateDetailedCSV = () => {
    let csv = 'Date,Client,Project,Consultant,Job Type,Hours,Billable,Hourly Rate,Revenue,Description\n';
    reportData.forEach(entry => {
      const revenue = entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)) : 0;
      const jobTypeName = entry.project?.job_type?.name || '';
      csv += `${entry.entry_date},${entry.project?.client?.client_name || ''},${entry.project?.name || ''},${entry.consultant?.full_name || ''},${jobTypeName},${entry.duration_hours || 0},${entry.is_billable ? 'Yes' : 'No'},${entry.hourly_rate || 0},${revenue.toFixed(2)},${entry.description || ''}\n`;
    });
    return csv;
  };

  const generateProductivityCSV = () => {
    let csv = 'Date,Client,Project,Consultant,Job Type,Hours,Billable,Hourly Rate,Revenue,Efficiency\n';
    reportData.forEach(entry => {
      const hourlyRate = entry.hourlyRate ?? entry.hourly_rate ?? 0;
      const revenue = entry.revenue ?? (entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)) : 0);
      const efficiency = entry.efficiency ?? 0;
      const jobTypeName = entry.project?.job_type?.name || '';

      csv += `${entry.entry_date},${entry.project?.client?.client_name || ''},${entry.project?.name || ''},${entry.consultant?.full_name || ''},${jobTypeName},${entry.duration_hours || 0},${entry.is_billable ? 'Yes' : 'No'},${hourlyRate},${Number(revenue).toFixed(2)},${efficiency}\n`;
    });
    return csv;
  };

  const generateClientCSV = () => {
    let csv = 'Client,Total Hours,Billable Hours,Total Revenue,Project Count,Consultant Count\n';
    reportData.forEach(row => {
      csv += `${row.clientName},${row.totalHours.toFixed(2)},${row.billableHours.toFixed(2)},${row.totalRevenue.toFixed(2)},${row.projectCount},${row.consultantCount}\n`;
    });
    return csv;
  };

  const generateConsultantCSV = () => {
    let csv = 'Consultant,Total Hours,Billable Hours,Total Revenue,Client Count,Project Count\n';
    reportData.forEach(row => {
      csv += `${row.consultantName},${row.totalHours.toFixed(2)},${row.billableHours.toFixed(2)},${row.totalRevenue.toFixed(2)},${row.clientCount},${row.projectCount}\n`;
    });
    return csv;
  };

  const generateJobTypeCSV = () => {
    let csv = 'Job Type,Category,Total Hours,Billable Hours,Total Revenue\n';
    reportData.forEach(row => {
      csv += `${row.jobTypeName},${row.category},${row.totalHours.toFixed(2)},${row.billableHours.toFixed(2)},${row.totalRevenue.toFixed(2)}\n`;
    });
    return csv;
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const quickDateRange = (range) => {
    const now = dayjs();
    let from, to;

    switch (range) {
      case 'thisMonth':
        from = now.startOf('month');
        to = now.endOf('month');
        break;
      case 'lastMonth':
        from = now.subtract(1, 'month').startOf('month');
        to = now.subtract(1, 'month').endOf('month');
        break;
      case 'last3Months':
        from = now.subtract(3, 'month').startOf('month');
        to = now.endOf('month');
        break;
      case 'thisYear':
        from = now.startOf('year');
        to = now.endOf('year');
        break;
      default:
        return;
    }

    updateFilter('dateFrom', from.format('YYYY-MM-DD'));
    updateFilter('dateTo', to.format('YYYY-MM-DD'));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-300">
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Billing Reports</h1>
        <p className="text-lg text-gray-600">Comprehensive reporting with advanced filtering capabilities</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-2 bg-gray-100 p-1.5 rounded-xl shadow-inner inline-flex">
          {['filters', 'results'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 transform ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-md scale-100'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab === 'filters' ? (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  Filters & Settings
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Report Results
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'filters' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Report Type Nature Selection */}
          <div className="mb-10">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center">
              <span className="bg-gray-100 text-gray-400 p-1 rounded-md mr-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </span>
              Step 1: Choose Report Format
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'summary', label: 'Summary', desc: 'Aggregated', icon: '📊' },
                { value: 'detailed', label: 'Detailed', desc: 'Entries', icon: '📝' },
                { value: 'client', label: 'Client', desc: 'Customers', icon: '🏢' },
                { value: 'consultant', label: 'Staff', desc: 'Resource', icon: '👨‍💼' },
                { value: 'jobtype', label: 'Services', desc: 'Category', icon: '🛠️' },
                { value: 'productivity', label: 'Efficiency', desc: 'KPIs', icon: '📈' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => updateFilter('reportType', type.value)}
                  className={`flex items-center px-4 py-3 rounded-2xl border-2 transition-all duration-300 group min-w-[140px] ${
                    filters.reportType === type.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold shadow-md ring-4 ring-blue-100/50 -translate-y-1'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <span className={`mr-3 text-2xl transition-transform duration-300 group-hover:scale-110 ${filters.reportType === type.value ? 'scale-110' : ''}`}>
                    {type.icon}
                  </span>
                  <div className="text-left">
                    <div className="text-sm border-b border-transparent group-hover:border-gray-200 transition-all font-bold">{type.label}</div>
                    <div className={`text-[9px] uppercase font-black tracking-wider opacity-60 ${filters.reportType === type.value ? 'text-blue-500' : 'text-gray-400'}`}>
                      {type.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Bar - Modern Horizontal Style */}
          <div className="space-y-6 mt-10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Report Filters
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Quick Dates:</span>
                {[
                  { key: 'thisMonth', label: 'Month' },
                  { key: 'lastMonth', label: 'Last' },
                  { key: 'thisYear', label: 'Year' }
                ].map(range => (
                  <button
                    key={range.key}
                    onClick={() => quickDateRange(range.key)}
                    className="px-3 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-200 text-gray-600 rounded-lg transition-all shadow-sm font-bold"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-inner">
              {/* Customer */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">Customer</label>
                <select
                  value={filters.clients.length === 1 ? filters.clients[0] : ''}
                  onChange={(e) => updateFilter('clients', e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="">All Customes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </div>

              {/* Consultant */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">Consultant</label>
                <select
                  value={filters.consultants.length === 1 ? filters.consultants[0] : ''}
                  onChange={(e) => updateFilter('consultants', e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="">All Staff</option>
                  {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>

              {/* Service */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">Service Type</label>
                <select
                  value={filters.jobTypes.length === 1 ? filters.jobTypes[0] : ''}
                  onChange={(e) => updateFilter('jobTypes', e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="">Any Service</option>
                  {jobTypes.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">Job Status</label>
                <select
                  value={filters.projectStatus}
                  onChange={(e) => updateFilter('projectStatus', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="">Any Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="ready_to_bill">Ready to Bill</option>
                  <option value="billed">Billed</option>
                </select>
              </div>

              {/* From */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                />
              </div>

              {/* To */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                />
              </div>

              {/* Group By */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase ml-1">Group By</label>
                <select
                  value={filters.groupBy}
                  onChange={(e) => updateFilter('groupBy', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                </select>
              </div>

              {/* Billable Toggle */}
              <div className="flex flex-col justify-end pb-1.5">
                <label className="flex items-center space-x-2 cursor-pointer group p-1 bg-white border border-gray-200 rounded-xl h-[38px] px-2 shadow-sm">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.billableOnly}
                      onChange={(e) => updateFilter('billableOnly', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase group-hover:text-blue-600 transition-colors leading-tight">Billable<br/>Only</span>
                </label>
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full h-[38px] bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      RUN REPORT
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Results Header */}
          <div className="p-8 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </span>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    {filters.reportType.charAt(0).toUpperCase() + filters.reportType.slice(1)} Report
                  </h2>
                </div>
                <p className="text-gray-500 mt-1 font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {dayjs(filters.dateFrom).format('MMM DD, YYYY')} — {dayjs(filters.dateTo).format('MMM DD, YYYY')}
                </p>
              </div>
              <div className="flex space-x-3 w-full md:w-auto">
                <button
                  onClick={() => setActiveTab('filters')}
                  className="flex-1 md:flex-none px-5 py-2.5 text-gray-700 font-bold hover:text-gray-900 border-2 border-gray-200 rounded-xl hover:bg-white hover:border-gray-300 transition-all active:scale-95 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Modify Filters
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={exporting || reportData.length === 0}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center"
                >
                  {exporting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Content */}
          <div className="p-0"> {/* Removed padding for full-width table */}
            {reportData.length === 0 ? (
              <div className="text-center py-20 bg-gray-50/30">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">No data available</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">No time entries match your selected filters. Try adjusting your date range or selecting more clients/consultants.</p>
                <button
                  onClick={() => setActiveTab('filters')}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                >
                  Adjust Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {renderReportTable()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function renderReportTable() {
    const tableHeaderClass = "px-6 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-widest bg-gray-100/80 sticky top-0 backdrop-blur-sm z-10 border-b border-gray-200";
    const tableCellClass = "px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 transition-colors";
    const tableRowClass = "hover:bg-blue-50/40 transition-colors group";

    switch (filters.reportType) {
      case 'summary':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Period</th>
                <th className={tableHeaderClass}>Total Hours</th>
                <th className={tableHeaderClass}>Billable Hours</th>
                <th className={tableHeaderClass}>Total Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {reportData.map((row, index) => (
                <tr key={index} className={tableRowClass}>
                  <td className={`${tableCellClass} font-bold text-gray-900 group-hover:text-blue-700`}>{row.period}</td>
                  <td className={tableCellClass}>{row.totalHours.toFixed(2)} hrs</td>
                  <td className={tableCellClass}>
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium">{row.billableHours.toFixed(2)} hrs</span>
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900 text-lg`}>R {row.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'detailed':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Date</th>
                <th className={tableHeaderClass}>Client / Project</th>
                <th className={tableHeaderClass}>Consultant</th>
                <th className={tableHeaderClass}>Job Type</th>
                <th className={tableHeaderClass}>Hours</th>
                <th className={tableHeaderClass}>Billable</th>
                <th className={tableHeaderClass}>Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {reportData.map((entry, index) => (
                <tr key={index} className={tableRowClass}>
                  <td className={`${tableCellClass} font-medium text-gray-900`}>{dayjs(entry.entry_date).format('DD MMM')}</td>
                  <td className={tableCellClass}>
                    <div className="font-bold text-gray-900">{entry.project?.client?.client_name}</div>
                    <div className="text-xs text-gray-500 font-medium">{entry.project?.name}</div>
                  </td>
                  <td className={tableCellClass}>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {entry.consultant?.full_name?.split(' ').map(n => n[0]).join('')}
                    </span>
                    <span className="ml-2 text-gray-700">{entry.consultant?.full_name}</span>
                  </td>
                  <td className={tableCellClass}>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase">{entry.project?.job_type?.name}</span>
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900`}>{entry.duration_hours?.toFixed(2)}</td>
                  <td className={tableCellClass}>
                    {entry.is_billable ? 
                      <span className="flex items-center text-green-600 font-bold"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Yes</span> : 
                      <span className="flex items-center text-gray-400 font-medium italic"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> No</span>
                    }
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900`}>
                    R{entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'client':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Client</th>
                <th className={tableHeaderClass}>Summary Indicators</th>
                <th className={tableHeaderClass}>Hours (B/T)</th>
                <th className={tableHeaderClass}>Revenue</th>
                <th className={tableHeaderClass}>Projects</th>
                <th className={tableHeaderClass}>Staff</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {reportData.map((row, index) => (
                <tr key={index} className={tableRowClass}>
                  <td className={`${tableCellClass} font-extrabold text-gray-900 text-base`}>{row.clientName}</td>
                  <td className={tableCellClass}>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px]">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, (row.billableHours / (row.totalHours || 1)) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1 block">Billable: {Math.round((row.billableHours / (row.totalHours || 1)) * 100)}%</span>
                  </td>
                  <td className={tableCellClass}>
                    <span className="font-bold text-gray-900">{row.billableHours.toFixed(1)}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-500">{row.totalHours.toFixed(1)}</span>
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900 text-lg`}>R {row.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className={tableCellClass}>
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">{row.projectCount} Jobs</span>
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex -space-x-2 overflow-hidden">
                      {[...Array(Math.min(3, row.consultantCount))].map((_, i) => (
                        <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          U
                        </div>
                      ))}
                      {row.consultantCount > 3 && <span className="ml-4 text-xs font-bold text-gray-400">+{row.consultantCount - 3}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'consultant':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Consultant</th>
                <th className={tableHeaderClass}>Total Hours</th>
                <th className={tableHeaderClass}>Billable Hours</th>
                <th className={tableHeaderClass}>Revenue</th>
                <th className={tableHeaderClass}>Coverage</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {reportData.map((row, index) => (
                <tr key={index} className={tableRowClass}>
                  <td className={`${tableCellClass} font-bold text-gray-900`}>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mr-3 shadow-sm">
                        {row.consultantName.split(' ').map(n => n[0]).join('')}
                      </div>
                      {row.consultantName}
                    </div>
                  </td>
                  <td className={`${tableCellClass} text-lg`}>{row.totalHours.toFixed(2)}</td>
                  <td className={tableCellClass}>
                    <div className="flex items-center">
                      <span className="font-bold text-green-700 mr-2">{row.billableHours.toFixed(2)}</span>
                      <span className="text-xs text-green-500 font-medium">({Math.round((row.billableHours / (row.totalHours || 1)) * 100)}%)</span>
                    </div>
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900 text-lg`}>R {row.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className={tableCellClass}>
                    <div className="flex items-center space-x-2">
                       <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">{row.clientCount} Clients</span>
                       <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">{row.projectCount} Projects</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'jobtype':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Job Type</th>
                <th className={tableHeaderClass}>Category</th>
                <th className={tableHeaderClass}>Total Hours</th>
                <th className={tableHeaderClass}>Billable %</th>
                <th className={tableHeaderClass}>Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {reportData.map((row, index) => (
                <tr key={index} className={tableRowClass}>
                  <td className={`${tableCellClass} font-bold text-gray-900`}>{row.jobTypeName}</td>
                  <td className={tableCellClass}>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-bold border border-amber-100 uppercase tracking-tighter">{row.category}</span>
                  </td>
                  <td className={tableCellClass}>{row.totalHours.toFixed(2)} hrs</td>
                  <td className={tableCellClass}>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 h-1.5 rounded-full mr-2">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(row.billableHours / (row.totalHours || 1)) * 100}%` }}></div>
                      </div>
                      <span className="font-bold text-xs">{Math.round((row.billableHours / (row.totalHours || 1)) * 100)}%</span>
                    </div>
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900 text-lg`}>R {row.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'productivity':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Consultant Name</th>
                <th className={tableHeaderClass}>Efficiency Rating</th>
                <th className={tableHeaderClass}>Worked / Target</th>
                <th className={tableHeaderClass}>Billable Hours</th>
                <th className={tableHeaderClass}>Revenue Gen.</th>
                <th className={tableHeaderClass}>Active Projects</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {reportData.map((staff, index) => (
                <tr key={index} className={tableRowClass}>
                  <td className={`${tableCellClass} font-bold text-gray-900`}>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold mr-3 uppercase">
                        {staff.consultantName.split(' ').map(n=>n[0]).join('').substring(0,2)}
                      </div>
                      {staff.consultantName}
                    </div>
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex flex-col w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-extrabold ${staff.efficiency >= 1 ? 'text-green-600' : staff.efficiency >= 0.8 ? 'text-amber-500' : 'text-red-500'}`}>
                          {(staff.efficiency * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Target</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${staff.efficiency >= 1 ? 'bg-green-500' : staff.efficiency >= 0.8 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, staff.efficiency * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className={tableCellClass}>
                    <div className="font-bold text-gray-700">{staff.totalBillableHours.toFixed(1)} <span className="text-gray-400 font-normal">/ {staff.targetHours}h</span></div>
                  </td>
                  <td className={tableCellClass}>
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold text-xs">
                      {staff.totalBillableHours.toFixed(1)} HRS
                    </span>
                  </td>
                  <td className={`${tableCellClass} font-bold text-gray-900 text-lg`}>
                    R {staff.revenueGenerated.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                  <td className={tableCellClass}>
                    <span className="text-gray-500 font-medium">{staff.projectCount} Projects</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return <div>No report type selected</div>;
    }
  }
};

export default BillingReports;
