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
        project:projects(id, name, status, billing_date, invoice_number, client:clients(id, client_name), job_type:job_types(id, name, category)),
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

    // Calculate productivity metrics
    const productivityData = detailedData.map(entry => ({
      ...entry,
      hourlyRate: entry.hourly_rate || 0,
      revenue: entry.is_billable ? (entry.duration_hours || 0) * (entry.hourly_rate || 0) : 0,
      efficiency: entry.duration_hours > 0 ? (entry.is_billable ? 1 : 0) : 0
    }));

    return productivityData;
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing Reports</h1>
        <p className="text-gray-600">Comprehensive reporting with advanced filtering capabilities</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['filters', 'results'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'filters' ? 'Filters & Settings' : 'Report Results'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'filters' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Report Type Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Report Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'summary', label: 'Summary Report', desc: 'Aggregated data by period' },
                { value: 'detailed', label: 'Detailed Report', desc: 'Individual time entries' },
                { value: 'client', label: 'Client Report', desc: 'Grouped by client' },
                { value: 'consultant', label: 'Consultant Report', desc: 'Grouped by consultant' },
                { value: 'jobtype', label: 'Job Type Report', desc: 'Grouped by job type' },
                { value: 'productivity', label: 'Productivity Report', desc: 'Efficiency metrics' }
              ].map(type => (
                <label key={type.value} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={filters.reportType === type.value}
                    onChange={(e) => updateFilter('reportType', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={filters.groupBy}
                  onChange={(e) => updateFilter('groupBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                </select>
              </div>
            </div>

            {/* Quick Date Ranges */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'thisMonth', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' },
                { key: 'last3Months', label: 'Last 3 Months' },
                { key: 'thisYear', label: 'This Year' }
              ].map(range => (
                <button
                  key={range.key}
                  onClick={() => quickDateRange(range.key)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <span className="mr-2">{showAdvancedFilters ? '▼' : '▶'}</span>
              Advanced Filters
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="border-t pt-4">
              {/* Client Filter */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Clients</h4>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                  {clients.map(client => (
                    <label key={client.id} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={filters.clients.includes(client.id)}
                        onChange={() => toggleArrayFilter('clients', client.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{client.client_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Consultant Filter */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Consultants</h4>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                  {consultants.map(consultant => (
                    <label key={consultant.id} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={filters.consultants.includes(consultant.id)}
                        onChange={() => toggleArrayFilter('consultants', consultant.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{consultant.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Job Type Filter */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Job Types</h4>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                  {jobTypes.map(jobType => (
                    <label key={jobType.id} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={filters.jobTypes.includes(jobType.id)}
                        onChange={() => toggleArrayFilter('jobTypes', jobType.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{jobType.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Status</label>
                  <select
                    value={filters.projectStatus}
                    onChange={(e) => updateFilter('projectStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="ready_to_bill">Ready to Bill</option>
                    <option value="billed">Billed</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billableOnly"
                    checked={filters.billableOnly}
                    onChange={(e) => updateFilter('billableOnly', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="billableOnly" className="text-sm font-medium text-gray-700">
                    Billable hours only
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Generate Report Button */}
          <div className="mt-6">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Generating Report...' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Results Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  {filters.reportType.charAt(0).toUpperCase() + filters.reportType.slice(1)} Report
                </h2>
                <p className="text-gray-600">
                  {dayjs(filters.dateFrom).format('MMM DD, YYYY')} - {dayjs(filters.dateTo).format('MMM DD, YYYY')}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTab('filters')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Modify Filters
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={exporting || reportData.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Content */}
          <div className="p-6">
            {reportData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No data found for the selected filters.</p>
                <button
                  onClick={() => setActiveTab('filters')}
                  className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Adjust Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {renderReportTable()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function renderReportTable() {
    switch (filters.reportType) {
      case 'summary':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.billableHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{row.totalRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'detailed':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((entry, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.entry_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.project?.client?.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.project?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.consultant?.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.project?.job_type?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.duration_hours?.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.is_billable ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    R{entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)).toFixed(2) : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'client':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultants</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.clientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.billableHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{row.totalRevenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.projectCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.consultantCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'consultant':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.consultantName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.billableHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{row.totalRevenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.clientCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.projectCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'jobtype':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.jobTypeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.totalHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.billableHours.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{row.totalRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'productivity':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((entry, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.entry_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.project?.client?.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.project?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.consultant?.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.project?.job_type?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(entry.duration_hours || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.is_billable ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{Number(entry.hourlyRate ?? entry.hourly_rate ?? 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{Number(entry.revenue ?? 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(entry.efficiency ?? 0).toFixed(2)}</td>
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
