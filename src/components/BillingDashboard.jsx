import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, AlertCircle, CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import { ProjectService, ReportingService, TimeEntryService } from '../services/TimesheetService';

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

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

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
        if (p.status === 'Invoiced' || !p.expected_billing_date) return false;
        const billingDate = new Date(p.expected_billing_date);
        return billingDate < today;
      });

      const dueToday = allProjects.filter(p => {
        if (p.status === 'Invoiced' || !p.expected_billing_date) return false;
        const billingDate = new Date(p.expected_billing_date);
        billingDate.setHours(0, 0, 0, 0);
        return billingDate.getTime() === today.getTime();
      });

      // Calculate stats
      const readyToBill = allProjects.filter(p => p.status === 'Completed').length;
      const completedProjects = allProjects.filter(p => p.status === 'Completed' || p.status === 'Invoiced').length;
      const pendingInvoices = allProjects.filter(p => p.status === 'Completed').length;

      // Get billing report
      const reportRes = await ReportingService.getBillingReport({ period: selectedPeriod });
      const report = reportRes.data || {};

      setStats({
        readyToBill,
        totalBillableHours: report.total_billable_hours || 0,
        completedProjects,
        pendingInvoices,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length
      });

      setOverdueProjects(overdue);

      // Sort projects by expected billing date
      const sortedProjects = allProjects.sort((a, b) => {
        if (a.expected_billing_date && b.expected_billing_date) {
          return new Date(a.expected_billing_date) - new Date(b.expected_billing_date);
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

  const handleMarkInvoiced = async (projectId) => {
    const invoiceNumber = prompt('Enter invoice number:');
    if (!invoiceNumber) return;

    const result = await ProjectService.update(projectId, {
      status: 'Invoiced',
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0]
    });

    if (!result.error) {
      loadDashboardData();
    }
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
            <DollarSign className="w-7 h-7 text-green-600" />
            Billing Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track projects ready for invoicing</p>
        </div>
      </div>

        {/* Urgent Alert Banner */}
        {(stats.overdueCount > 0 || stats.dueTodayCount > 0) && (
          <div className={`mb-6 rounded-lg p-4 ${stats.overdueCount > 0 ? 'bg-red-50 border border-red-300' : 'bg-orange-50 border border-orange-300'}`}>
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
                    {overdueProjects.slice(0, 3).map(p => p.project_name).join(', ')}
                    {overdueProjects.length > 3 && ` +${overdueProjects.length - 3} more`}
                  </p>
                )}
              </div>
              <Bell className={`w-5 h-5 ${stats.overdueCount > 0 ? 'text-red-500 animate-bounce' : 'text-orange-500'}`} />
            </div>
          </div>
        )}

        {/* Period Selector */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {project.project_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {project.client_id}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === 'Completed' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : project.status === 'Invoiced'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">
                        {project.total_hours?.toFixed(2) || '0.00'}h
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {project.expected_billing_date 
                          ? new Date(project.expected_billing_date).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {project.status === 'Completed' ? (
                          <button
                            onClick={() => handleMarkInvoiced(project.id)}
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
      </div>
    </div>
  );
}
