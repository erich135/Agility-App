import React, { useState, useEffect, useRef } from 'react';
import { ReportingService, ConsultantService, JobTypeService } from '../services/TimesheetService';
import supabase from '../lib/SupabaseClient';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';

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

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    date: '',
    hours: '',
    description: '',
    hourlyRate: '',
    consultantId: '',
    jobTypeId: '',
    projectId: '',
    isBillable: true,
    isInvoiced: false
  });
  const [editProjects, setEditProjects] = useState([]);

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
        case 'client_timesheet':
          // Re-use detailed report data fetching but we will filter/display differently
          data = await generateDetailedReport();
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
        client:clients(id, client_name),
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
        filters.clients.includes(entry.client?.id || entry.project?.client?.id)
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
        client:clients(id, client_name),
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
        filters.clients.includes(entry.client?.id || entry.project?.client?.id)
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
      const clientId = entry.client?.id || entry.project?.client?.id || 'unknown';
      const clientName = entry.client?.client_name || entry.project?.client?.client_name || 'Unknown Client';

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

  const exportToPDF = () => {
    setExporting(true);
    try {
      // Landscape A4: 297mm width, 210mm height
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text(`${filters.reportType.replace(/_/g, ' ').toUpperCase()} REPORT`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${dayjs(filters.dateFrom).format('MMM DD, YYYY')} - ${dayjs(filters.dateTo).format('MMM DD, YYYY')}`, 14, 28);
      
      // Add Client Name if filtered by single client
      if (filters.clients.length === 1) {
        const clientName = clients.find(c => c.id === filters.clients[0])?.client_name || 'Unknown Client';
        doc.text(`Client: ${clientName}`, 14, 33);
        doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 38);
      } else {
         doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 33);
      }

      let yPos = 50;
      const margin = 14;
      
      if (filters.reportType === 'client_timesheet') {
        const cols = [
          { header: 'Date', x: 14, w: 25 },
          { header: 'Customer', x: 40, w: 40 }, // Customer Added
          { header: 'Consultant', x: 82, w: 35 },
          { header: 'Job Type', x: 119, w: 35 },
          { header: 'Description', x: 156, w: 85 }, // Much wider for desc
          { header: 'Hrs', x: 242, w: 10, align: 'right' },
          { header: 'Rate', x: 254, w: 15, align: 'right' },
          { header: 'Total', x: 271, w: 20, align: 'right' }
        ];

        // Header Helper
        const drawHeader = (y) => {
            doc.setFontSize(9);
            doc.setTextColor(80);
            doc.setFont(undefined, 'bold');
            cols.forEach(col => {
                doc.text(col.header, col.x + (col.align === 'right' ? col.w : 0), y, { align: col.align || 'left' });
            });
            doc.setDrawColor(200);
            doc.line(margin, y + 2, pageWidth - margin, y + 2);
        };

        drawHeader(yPos);
        yPos += 8;

        // Draw Rows
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(9);

        let totalHours = 0;
        let totalRevenue = 0;

        reportData.forEach((entry) => {
          // Calculate row height first
          const descClean = (entry.description || '').replace(/[\r\n]+/g, " ");
          const descLines = doc.splitTextToSize(descClean, cols[4].w); // Adjusted to index 4 for Description
          const rowHeight = Math.max(8, descLines.length * 3.5) + 4; // Dynamic height

          // Check page break (Landscape height is smaller, ~210mm)
          if (yPos + rowHeight > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
            drawHeader(yPos);
            yPos += 8;
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0);
            doc.setFontSize(9);
          }

          const revenue = entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)) : 0;
          totalHours += (entry.duration_hours || 0);
          totalRevenue += revenue;
          
          // Date
          doc.text(dayjs(entry.entry_date).format('YYYY/MM/DD'), cols[0].x, yPos);
          
          // Customer (Client Name)
          doc.setFont(undefined, 'bold');
          doc.setTextColor(50);
          const clientName = entry.client?.client_name || entry.project?.client?.client_name || '';
          const clientLines = doc.splitTextToSize(clientName, cols[1].w);
          doc.text(clientLines, cols[1].x, yPos);

          // Name with Role
          doc.setFont(undefined, 'bold');
          doc.setTextColor(0);
          const name = entry.consultant?.full_name || '';
          doc.text(name, cols[2].x, yPos);
          
          doc.setFont(undefined, 'normal');
          doc.setFontSize(7);
          doc.setTextColor(120);
          const role = entry.consultant?.role || 'Consultant';
          doc.text(role.toUpperCase(), cols[2].x, yPos + 3.5);
          
          // Job Type
          doc.setFontSize(8);
          doc.setTextColor(50);
          const jobType = entry.project?.job_type?.name || '';
          const jobTypeSplit = doc.splitTextToSize(jobType, cols[3].w);
          doc.text(jobTypeSplit, cols[3].x, yPos);

          // Description
          doc.setFontSize(8); 
          doc.setTextColor(0);
          doc.text(descLines, cols[4].x, yPos);
          
          // Values
          doc.setFontSize(9);
          doc.text((entry.duration_hours || 0).toFixed(2), cols[5].x + cols[5].w, yPos, { align: 'right' });
          doc.text((entry.hourly_rate || 0).toFixed(0), cols[6].x + cols[6].w, yPos, { align: 'right' });
          doc.setFont(undefined, 'bold');
          doc.text(revenue.toLocaleString(undefined, {minimumFractionDigits: 2}), cols[7].x + cols[7].w, yPos, { align: 'right' });
          doc.setFont(undefined, 'normal');

          yPos += rowHeight;
          
          // Light separator line
          doc.setDrawColor(240);
          doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        });

        // Totals
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 30; }
        yPos += 2;
        doc.setDrawColor(0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('TOTALS:', 200, yPos);
        doc.text(totalHours.toFixed(2), cols[5].x + cols[5].w, yPos, { align: 'right' });
        doc.text('R ' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2}), cols[7].x + cols[7].w, yPos, { align: 'right' });

      } else {
        // Generic fallback for other reports
        doc.setFontSize(10);
        doc.text("Basic PDF export for this report type.", 14, 50);
        
        let y = 60;
        const keys = Object.keys(reportData[0] || {});
        
        // Simple list dump
        doc.setFontSize(8);
        reportData.slice(0, 50).forEach(item => { // Limit to 50 for safety
            const line = keys.slice(0, 3).map(k => `${k}: ${item[k]}`).join(' | ');
            doc.text(line, 14, y);
            y+=5;
        });
      }

      doc.save(`Report_${filters.reportType}_${dayjs().format('YYYY-MM-DD')}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      let csvContent = '';

      switch (filters.reportType) {
        case 'summary':
          csvContent = generateSummaryCSV();
          break;
        case 'client_timesheet':
          csvContent = generateClientTimesheetCSV();
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

  const handleEditClick = async (entry) => {
    setEditFormData({
      id: entry.id,
      date: entry.entry_date,
      hours: entry.duration_hours,
      description: entry.description || '',
      hourlyRate: entry.hourly_rate,
      consultantId: entry.consultant_id,
      jobTypeId: entry.job_type_id || entry.project?.job_type_id || '',
      projectId: entry.project_id || '',
      isBillable: entry.is_billable,
      isInvoiced: entry.is_invoiced || entry.status === 'invoiced'
    });

    // Load projects for this client
    const clientId = entry.client?.id || entry.project?.client?.id;
    if (clientId) {
      try {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .eq('client_id', clientId)
          .neq('status', 'cancelled')
          .order('name');
        setEditProjects(data || []);
      } catch (e) {
        console.error('Error fetching projects:', e);
        setEditProjects([]);
      }
    } else {
      setEditProjects([]);
    }
    
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          entry_date: editFormData.date,
          duration_hours: editFormData.hours,
          description: editFormData.description,
          hourly_rate: editFormData.hourlyRate,
          consultant_id: editFormData.consultantId,
          job_type_id: editFormData.jobTypeId || null,
          project_id: editFormData.projectId || null,
          is_billable: editFormData.isBillable,
          is_invoiced: editFormData.isInvoiced,
          status: editFormData.isInvoiced ? 'invoiced' : 'draft'
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      setShowEditModal(false);
      // Refresh the report data without full page reload if possible, 
      // but generateReport is available so we use that.
      generateReport();
      // Optional: alert('Updated'); 
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry: ' + error.message);
    }
  };

  const generateSummaryCSV = () => {
    let csv = 'Period,Total Hours,Billable Hours,Total Revenue\n';
    reportData.forEach(row => {
      csv += `${row.period},${row.totalHours.toFixed(2)},${row.billableHours.toFixed(2)},${row.totalRevenue.toFixed(2)}\n`;
    });
    return csv;
  };

  const generateClientTimesheetCSV = () => {
    let csv = 'Date,Customer,Name,Job Type,Description,Hours,Rate,Amount,Invoiced\n';
    reportData.forEach(entry => {
      const revenue = entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)) : 0;
      const jobTypeName = entry.project?.job_type?.name || '';
      csv += `${entry.entry_date},"${entry.client?.client_name || entry.project?.client?.client_name || ''}","${entry.consultant?.full_name || ''}",${jobTypeName},"${entry.description || ''}",${entry.duration_hours || 0},${entry.hourly_rate || 0},${revenue.toFixed(2)},${entry.is_invoiced || entry.status === 'invoiced' ? 'Yes' : 'No'}\n`;
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
    <div className="w-full max-w-[98%] mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-300">
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Billing Reports</h1>
        <p className="text-lg text-gray-600">Comprehensive reporting with advanced filtering capabilities</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="space-x-2 bg-gray-100 p-1.5 rounded-xl shadow-inner inline-flex">
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
                { value: 'client_timesheet', label: 'Client TS', desc: 'Time Logs', icon: '📋' },
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
                {filters.reportType === 'client_timesheet' && (
                  <p className="text-xs text-blue-600 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded">
                    💡 Click on any row to edit the entry
                  </p>
                )}
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
                  onClick={exportToPDF}
                  disabled={exporting || reportData.length === 0}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center"
                >
                  {exporting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      Export PDF
                    </>
                  )}
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

      {/* Edit Entry Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Time Entry</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update details for this record</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Date & Hours Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Date</label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Hours</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.hours}
                    onChange={(e) => setEditFormData({ ...editFormData, hours: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>

               {/* Consultant & Rate Row */}
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Consultant</label>
                  <select
                    value={editFormData.consultantId}
                    onChange={(e) => setEditFormData({ ...editFormData, consultantId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                     {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Hourly Rate (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.hourlyRate}
                    onChange={(e) => setEditFormData({ ...editFormData, hourlyRate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {/* Project & Job Type */}
              <div className="grid grid-cols-1 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Project</label>
                  <select
                    value={editFormData.projectId}
                    onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="">-- No Project (Direct to Client) --</option>
                    {editProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Job Type</label>
                   <select
                    value={editFormData.jobTypeId}
                    onChange={(e) => setEditFormData({ ...editFormData, jobTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="">-- Select Job Type --</option>
                    {jobTypes.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                ></textarea>
              </div>

              {/* Toggles */}
              <div className="flex space-x-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isBillable}
                    onChange={(e) => setEditFormData({ ...editFormData, isBillable: e.target.checked })}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition duration-150 ease-in-out"
                  />
                  <span className="text-sm font-bold text-gray-700">Billable</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isInvoiced}
                    onChange={(e) => setEditFormData({ ...editFormData, isInvoiced: e.target.checked })}
                    className="form-checkbox h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500 transition duration-150 ease-in-out"
                  />
                  <span className="text-sm font-bold text-gray-700">Mark as Invoiced</span>
                </label>
              </div>

            </div>

             <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-white border hover:border-gray-300 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95"
              >
                Save Changes
              </button>
            </div>
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

      case 'client_timesheet':
        return (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={tableHeaderClass}>Date</th>
                <th className={tableHeaderClass}>Customer</th>
                <th className={tableHeaderClass}>Name</th>
                <th className={tableHeaderClass}>Job Type</th>
                <th className={tableHeaderClass + " w-1/4"}>Description</th>
                <th className={tableHeaderClass}>Hours</th>
                <th className={tableHeaderClass}>Rate</th>
                <th className={tableHeaderClass}>Total</th>
                <th className={tableHeaderClass}>Inv.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {reportData.map((entry, index) => (
                <tr 
                  key={index} 
                  className={`${tableRowClass} cursor-pointer hover:bg-yellow-50 align-top`}
                  onClick={() => handleEditClick(entry)}
                  title="Click to edit this entry"
                >
                  <td className={`${tableCellClass} font-medium text-gray-900`}>{dayjs(entry.entry_date).format('YYYY/MM/DD')}</td>
                  <td className={`${tableCellClass} font-bold text-gray-800`}>{entry.client?.client_name || entry.project?.client?.client_name}</td>
                  <td className={tableCellClass}>
                    <div className="font-bold text-gray-900">{entry.consultant?.full_name}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{entry.consultant?.role || 'Consultant'}</div>
                  </td>
                  <td className={tableCellClass}>{entry.project?.job_type?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100 transition-colors whitespace-normal break-words min-w-[200px] max-w-sm">{entry.description}</td>
                  <td className={`${tableCellClass} font-bold`}>{entry.duration_hours?.toFixed(2)}</td>
                  <td className={tableCellClass}>R {entry.hourly_rate?.toFixed(2)}</td>
                  <td className={`${tableCellClass} font-bold text-gray-900`}>
                    R {entry.is_billable ? ((entry.duration_hours || 0) * (entry.hourly_rate || 0)).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                  </td>
                  <td className={tableCellClass}>
                    {entry.is_invoiced || entry.status === 'invoiced' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
               {/* Totals Row */}
               <tr className="bg-gray-100 font-bold">
                <td colSpan="5" className="px-6 py-4 text-right text-sm text-gray-700 uppercase tracking-widest">Totals:</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {reportData.reduce((sum, item) => sum + (item.duration_hours || 0), 0).toFixed(2)}
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-gray-900 text-lg">
                  R {reportData.reduce((sum, item) => sum + (item.is_billable ? ((item.duration_hours || 0) * (item.hourly_rate || 0)) : 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
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
                        <div key={i} className="h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
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
