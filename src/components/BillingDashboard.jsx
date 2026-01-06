import React, { useState, useEffect } from 'react';
import { Banknote, TrendingUp, Clock, AlertCircle, CheckCircle, AlertTriangle, Bell, X, FileText, User, Calendar, Download } from 'lucide-react';
import { ProjectService, ReportingService, TimeEntryService } from '../services/TimesheetService';
import jsPDF from 'jspdf';

export default function BillingDashboard() {
  const [stats, setStats] = useState({
    readyToBill: 0,
    totalBillableHours: 0,
    completedProjects: 0,
    pendingInvoices: 0,
    overdueCount: 0,
    dueTodayCount: 0
  });
  const [projects, setProjects] = useState([]);
  const [overdueProjects, setOverdueProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedProject) {
        closeProjectDetails();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedProject]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get all projects
      const projectsRes = await ProjectService.getAll();
      const allProjects = projectsRes.data || [];

      // Calculate billing urgency
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdue = allProjects.filter(p => {
        if (p.status === 'invoiced' || !p.billing_date) return false;
        const billingDate = new Date(p.billing_date);
        return billingDate < today;
      });

      const dueToday = allProjects.filter(p => {
        if (p.status === 'invoiced' || !p.billing_date) return false;
        const billingDate = new Date(p.billing_date);
        billingDate.setHours(0, 0, 0, 0);
        return billingDate.getTime() === today.getTime();
      });

      // Calculate stats
      const readyToBill = allProjects.filter(p => p.status === 'ready_to_bill').length;
      const completedProjects = allProjects.filter(p => p.status === 'ready_to_bill' || p.status === 'invoiced').length;
      const pendingInvoices = allProjects.filter(p => p.status === 'ready_to_bill').length;

      // Calculate billable hours from projects
      const totalBillableHours = allProjects.reduce((sum, p) => sum + (p.billable_hours || 0), 0);

      setStats({
        readyToBill,
        totalBillableHours,
        completedProjects,
        pendingInvoices,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length
      });

      setOverdueProjects(overdue);

      // Sort projects by billing date
      const sortedProjects = allProjects.sort((a, b) => {
        if (a.billing_date && b.billing_date) {
          return new Date(a.billing_date) - new Date(b.billing_date);
        }
        return 0;
      });

      setProjects(sortedProjects.slice(0, 10)); // Show latest 10
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInvoiced = async (projectId, invoiceOnlyUninvoiced = true) => {
    const invoiceNumber = prompt('Enter invoice number:');
    if (!invoiceNumber) return;

    try {
      // Get all time entries for this project
      const timeEntriesRes = await TimeEntryService.getByProject(projectId);
      const timeEntries = timeEntriesRes.data || [];
      
      // Determine which entries to invoice
      const entriesToInvoice = invoiceOnlyUninvoiced 
        ? timeEntries.filter(entry => entry.status !== 'invoiced')
        : timeEntries;

      // Mark time entries as invoiced
      for (const entry of entriesToInvoice) {
        await TimeEntryService.update(entry.id, {
          status: 'invoiced',
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0]
        });
      }

      // Check if all time entries are now invoiced
      const remainingUninvoiced = timeEntries.filter(e => 
        e.status !== 'invoiced' && !entriesToInvoice.find(ei => ei.id === e.id)
      ).length;

      // Only mark project as fully invoiced if no uninvoiced entries remain
      const projectStatus = remainingUninvoiced === 0 ? 'invoiced' : 'ready_to_bill';
      
      await ProjectService.update(projectId, {
        status: projectStatus,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0]
      });

      loadDashboardData();
      // Reload project details to show updated status
      if (selectedProject && selectedProject.id === projectId) {
        const updatedProject = { ...selectedProject, status: projectStatus };
        handleProjectClick(updatedProject);
      }
    } catch (error) {
      console.error('Error marking as invoiced:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  const handleProjectClick = async (project) => {
    setSelectedProject(project);
    setLoadingDetails(true);
    
    try {
      console.log('Loading details for project:', project.id, project.name);
      
      // Get all time entries for this project
      const timeEntriesRes = await TimeEntryService.getByProject(project.id);
      console.log('Time entries response:', timeEntriesRes);
      
      const timeEntries = timeEntriesRes.data || [];
      console.log('Time entries fetched:', timeEntries.length, timeEntries);
      
      // Separate invoiced and uninvoiced entries
      const invoicedEntries = timeEntries.filter(entry => entry.status === 'invoiced');
      const uninvoicedEntries = timeEntries.filter(entry => entry.status !== 'invoiced');
      
      // Group time entries by date
      const entriesByDate = timeEntries.reduce((acc, entry) => {
        const date = entry.entry_date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(entry);
        return acc;
      }, {});

      // Calculate totals
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
      const totalAmount = timeEntries.reduce((sum, entry) => {
        const hours = entry.duration_hours || 0;
        const rate = entry.hourly_rate || project.hourly_rate || 0;
        return sum + (hours * rate);
      }, 0);
      
      // Calculate invoiced totals
      const invoicedHours = invoicedEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
      const invoicedAmount = invoicedEntries.reduce((sum, entry) => {
        const hours = entry.duration_hours || 0;
        const rate = entry.hourly_rate || project.hourly_rate || 0;
        return sum + (hours * rate);
      }, 0);
      
      // Calculate uninvoiced totals
      const uninvoicedHours = uninvoicedEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
      const uninvoicedAmount = uninvoicedEntries.reduce((sum, entry) => {
        const hours = entry.duration_hours || 0;
        const rate = entry.hourly_rate || project.hourly_rate || 0;
        return sum + (hours * rate);
      }, 0);

      setProjectDetails({
        timeEntries,
        invoicedEntries,
        uninvoicedEntries,
        entriesByDate,
        totalHours,
        totalAmount,
        invoicedHours,
        invoicedAmount,
        uninvoicedHours,
        uninvoicedAmount
      });
    } catch (error) {
      console.error('Error loading project details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeProjectDetails = () => {
    setSelectedProject(null);
    setProjectDetails(null);
  };

  const exportJobCardToPDF = () => {
    if (!selectedProject || !projectDetails) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('JOB CARD', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Project Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Client: ${selectedProject.client?.client_name || 'N/A'}`, 20, yPos);
    yPos += 7;
    doc.text(`Project Number: ${selectedProject.project_number || 'N/A'}`, 20, yPos);
    yPos += 7;
    doc.text(`Billing Date: ${selectedProject.billing_date ? new Date(selectedProject.billing_date).toLocaleDateString('en-ZA') : 'Not set'}`, 20, yPos);
    yPos += 7;
    doc.text(`Status: ${selectedProject.status}`, 20, yPos);
    yPos += 12;

    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Hours: ${projectDetails.totalHours.toFixed(2)}h`, 20, yPos);
    yPos += 6;
    doc.text(`Total Amount: R ${projectDetails.totalAmount.toFixed(2)}`, 20, yPos);
    yPos += 6;
    doc.text(`Time Entries: ${projectDetails.timeEntries.length}`, 20, yPos);
    yPos += 12;

    // Time Entries
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Time Entries', 20, yPos);
    yPos += 8;

    if (projectDetails.timeEntries.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No time entries recorded', 20, yPos);
    } else {
      // Group by date
      const sortedDates = Object.keys(projectDetails.entriesByDate).sort((a, b) => new Date(b) - new Date(a));
      
      doc.setFontSize(10);
      sortedDates.forEach(date => {
        const entries = projectDetails.entriesByDate[date];
        const dayTotal = entries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);

        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        // Date header
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(59, 130, 246);
        doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 22, yPos);
        doc.text(`${dayTotal.toFixed(2)}h`, pageWidth - 22, yPos, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPos += 10;

        // Entries for this date
        entries.forEach(entry => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.text(`${entry.consultant?.full_name || 'Unknown'}`, 25, yPos);
          doc.text(`${entry.duration_hours?.toFixed(2) || '0.00'}h`, pageWidth - 22, yPos, { align: 'right' });
          yPos += 5;

          if (entry.description) {
            doc.setFont('helvetica', 'normal');
            const descLines = doc.splitTextToSize(entry.description, pageWidth - 50);
            doc.text(descLines, 25, yPos);
            yPos += descLines.length * 5;
          }

          // Additional info
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          let infoText = '';
          if (entry.task_type) infoText += `Task: ${entry.task_type}  `;
          if (entry.hourly_rate) infoText += `Rate: R${entry.hourly_rate}/hr  `;
          if (entry.status) infoText += `Status: ${entry.status}`;
          
          if (infoText) {
            doc.setTextColor(100, 100, 100);
            doc.text(infoText, 25, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 5;
          }
          
          doc.setFontSize(10);
          yPos += 5;
        });

        yPos += 3;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, 20, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    // Save PDF
    const fileName = `JobCard_${selectedProject.project_number || selectedProject.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-7 h-7 text-green-600" />
            Billing Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track projects ready for invoicing</p>
        </div>
      </div>

      {/* Urgent Alert Banner */}
      {(stats.overdueCount > 0 || stats.dueTodayCount > 0) && (
        <div className={`rounded-lg p-4 ${stats.overdueCount > 0 ? 'bg-red-50 border border-red-300' : 'bg-orange-50 border border-orange-300'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-orange-600'}`} />
            <div className="flex-1">
              <p className={`font-semibold ${stats.overdueCount > 0 ? 'text-red-800' : 'text-orange-800'}`}>
                {stats.overdueCount > 0 && `${stats.overdueCount} OVERDUE billing(s)!`}
                {stats.overdueCount > 0 && stats.dueTodayCount > 0 && ' • '}
                {stats.dueTodayCount > 0 && `${stats.dueTodayCount} due TODAY`}
              </p>
              {overdueProjects.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {overdueProjects.slice(0, 3).map(p => p.name).join(', ')}
                  {overdueProjects.length > 3 && ` +${overdueProjects.length - 3} more`}
                </p>
              )}
            </div>
            <Bell className={`w-5 h-5 ${stats.overdueCount > 0 ? 'text-red-500 animate-bounce' : 'text-orange-500'}`} />
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Ready to Bill</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.readyToBill}</p>
              <p className="text-gray-500 text-xs mt-2">Projects completed</p>
            </div>
            <AlertCircle className="w-12 h-12 text-blue-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Billable Hours</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.totalBillableHours.toFixed(1)}
              </p>
              <p className="text-gray-500 text-xs mt-2">Ready for invoicing</p>
            </div>
            <Clock className="w-12 h-12 text-green-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.completedProjects}</p>
              <p className="text-gray-500 text-xs mt-2">Projects finished</p>
            </div>
            <CheckCircle className="w-12 h-12 text-purple-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Invoices</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.pendingInvoices}</p>
              <p className="text-gray-500 text-xs mt-2">Awaiting invoice creation</p>
            </div>
            <TrendingUp className="w-12 h-12 text-red-100" />
          </div>
        </div>
      </div>

      {/* Projects Ready for Billing */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Projects Ready for Billing</h2>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No projects to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Billing Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr 
                    key={project.id} 
                    onClick={() => handleProjectClick(project)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {project.client?.client_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'ready_to_bill' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : project.status === 'invoiced'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'active'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {project.total_hours?.toFixed(2) || '0.00'}h
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {project.billing_date 
                        ? new Date(project.billing_date).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {project.status === 'ready_to_bill' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkInvoiced(project.id);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        >
                          Create Invoice
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeProjectDetails}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  {selectedProject.name}
                </h2>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Client</p>
                    <p className="font-medium text-gray-900">{selectedProject.client?.client_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Project Number</p>
                    <p className="font-medium text-gray-900">{selectedProject.project_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Billing Date</p>
                    <p className="font-medium text-gray-900">
                      {selectedProject.billing_date 
                        ? new Date(selectedProject.billing_date).toLocaleDateString('en-ZA')
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      selectedProject.status === 'ready_to_bill' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedProject.status === 'invoiced'
                        ? 'bg-green-100 text-green-800'
                        : selectedProject.status === 'active'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedProject.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeProjectDetails}
                className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : projectDetails ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Total Hours</p>
                      <p className="text-3xl font-bold text-blue-900 mt-1">
                        {projectDetails.totalHours.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-600 font-medium">Total Amount</p>
                      <p className="text-3xl font-bold text-green-900 mt-1">
                        R {projectDetails.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="text-sm text-yellow-600 font-medium">Uninvoiced Hours</p>
                      <p className="text-3xl font-bold text-yellow-900 mt-1">
                        {projectDetails.uninvoicedHours.toFixed(2)}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">R {projectDetails.uninvoicedAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-600 font-medium">Invoiced Hours</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {projectDetails.invoicedHours.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-700 mt-1">R {projectDetails.invoicedAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Project Description */}
                  {selectedProject.description && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Project Description</h3>
                      <p className="text-gray-600">{selectedProject.description}</p>
                    </div>
                  )}

                  {/* Time Entries by Date */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Detailed Time Entries
                    </h3>
                    
                    {Object.keys(projectDetails.entriesByDate).length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                        <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-yellow-800">No time entries recorded for this project</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(projectDetails.entriesByDate)
                          .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                          .map(([date, entries]) => {
                            const dayTotal = entries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
                            return (
                              <div key={date} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                {/* Date Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-semibold">
                                      {new Date(date).toLocaleDateString('en-ZA', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                                    {dayTotal.toFixed(2)}h
                                  </span>
                                </div>

                                {/* Time Entries for this date */}
                                <div className="divide-y divide-gray-100">
                                  {entries.map((entry, idx) => {
                                    const entryAmount = (entry.duration_hours || 0) * (entry.hourly_rate || selectedProject.hourly_rate || 0);
                                    const isInvoiced = entry.status === 'invoiced';
                                    return (
                                      <div key={idx} className={`p-4 hover:bg-gray-50 transition-colors ${isInvoiced ? 'bg-gray-100 opacity-75' : ''}`}>
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-gray-900">
                                              {entry.consultant?.full_name || 'Unknown Consultant'}
                                            </span>
                                            {isInvoiced && (
                                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                ✓ Invoiced
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <p className={`font-bold ${isInvoiced ? 'text-gray-500 line-through' : 'text-blue-600'}`}>{entry.duration_hours?.toFixed(2)}h</p>
                                            {entryAmount > 0 && (
                                              <p className={`text-sm ${isInvoiced ? 'text-gray-400' : 'text-gray-500'}`}>R {entryAmount.toFixed(2)}</p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {entry.description && (
                                          <div className={`mt-2 rounded p-3 border-l-4 ${isInvoiced ? 'bg-gray-50 border-gray-400' : 'bg-gray-50 border-blue-500'}`}>
                                            <p className="text-sm text-gray-700 leading-relaxed">{entry.description}</p>
                                          </div>
                                        )}

                                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                                          {entry.task_type && (
                                            <span className="flex items-center gap-1">
                                              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                              Task: {entry.task_type}
                                            </span>
                                          )}
                                          {entry.hourly_rate && (
                                            <span className="flex items-center gap-1">
                                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                              Rate: R {entry.hourly_rate}/hr
                                            </span>
                                          )}
                                          {entry.status && (
                                            <span className="flex items-center gap-1">
                                              <span className={`w-2 h-2 rounded-full ${
                                                entry.status === 'approved' ? 'bg-green-400' :
                                                entry.status === 'submitted' ? 'bg-yellow-400' :
                                                'bg-gray-400'
                                              }`}></span>
                                              Status: {entry.status}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No details available</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button
                onClick={exportJobCardToPDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Job Card PDF
              </button>
              <div className="flex gap-3">
                <button
                  onClick={closeProjectDetails}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                {selectedProject.status === 'active' && (
                  <button
                    onClick={async () => {
                      await ProjectService.update(selectedProject.id, { status: 'ready_to_bill' });
                      await loadDashboardData();
                      closeProjectDetails();
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Mark Ready to Bill
                  </button>
                )}
                {(selectedProject.status === 'ready_to_bill' || selectedProject.status === 'invoiced') && projectDetails?.uninvoicedHours > 0 && (
                  <button
                    onClick={() => handleMarkInvoiced(selectedProject.id, true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Banknote className="w-4 h-4" />
                    Invoice Uninvoiced Hours ({projectDetails.uninvoicedHours.toFixed(2)}h)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
