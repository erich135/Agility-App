import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Download, Filter } from 'lucide-react';
import { ReportingService, ProjectService, ClientService } from '../services/TimesheetService';

export default function BillingReports() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [clientData, setClientData] = useState([]);
  const [consultantData, setConsultantData] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));

  useEffect(() => {
    loadReportData();
  }, [selectedClient, selectedMonth]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load clients for filter
      const clientsRes = await ClientService.getAll();
      if (!clientsRes.error) {
        setClients(clientsRes.data || []);
      }

      // Load monthly billing data
      const monthlyRes = await ReportingService.getMonthlyBillingReport({ month: selectedMonth });
      if (!monthlyRes.error) {
        const monthlyData = monthlyRes.data || [];
        setMonthlyData(monthlyData);
      }

      // Load by client
      const clientRes = await ReportingService.getBillingByClient();
      if (!clientRes.error) {
        setClientData(clientRes.data || []);
      }

      // Load by consultant
      const consultantRes = await ReportingService.getBillingByConsultant();
      if (!consultantRes.error) {
        setConsultantData(consultantRes.data || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const exportToCSV = () => {
    const headers = ['Project', 'Client', 'Hours', 'Status'];
    const csvContent = [
      headers.join(','),
      ...monthlyData.map(row => [row.project, row.client, row.hours, row.status].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-report-${selectedMonth}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalHours = monthlyData.reduce((sum, item) => sum + (item.hours || 0), 0);
  const billableHours = monthlyData.filter(item => item.billable).reduce((sum, item) => sum + (item.hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-blue-600" />
            Billing Reports
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive billing analytics and insights</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.client_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Total Hours</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{totalHours.toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-2">For {selectedMonth}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Billable Hours</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{billableHours.toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-2">Ready to invoice</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Non-Billable Hours</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{(totalHours - billableHours).toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-2">Internal work</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Hours by Week</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Total Hours" />
                  <Bar dataKey="billable_hours" fill="#10b981" name="Billable Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Client Distribution */}
          {clientData.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Distribution by Client</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clientData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {clientData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Consultant */}
          {consultantData.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 lg:col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Billable Hours by Consultant</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consultantData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Detailed Breakdown</h2>
          </div>
          
          {monthlyData.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No data available for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Consultant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.project}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.consultant}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.hours?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={item.billable ? 'px-2 py-1 bg-green-100 text-green-800 rounded text-xs' : 'px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs'}>
                          {item.billable ? 'Billable' : 'Non-Billable'}
                        </span>
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
