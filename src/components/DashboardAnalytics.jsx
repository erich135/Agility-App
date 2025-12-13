import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import supabase from '../lib/SupabaseClient';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  FileText,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';

const DashboardAnalytics = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    upcomingFilings: 0,
    overdueFilings: 0,
    completedThisMonth: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    documentsUploaded: 0,
    activeTasks: 0
  });
  
  const [filingStatusData, setFilingStatusData] = useState({
    onTime: 0,
    dueSoon: 0,
    overdue: 0,
    completed: 0
  });

  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [highRiskClients, setHighRiskClients] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStatistics(),
        fetchFilingStatus(),
        fetchMonthlyTrends(),
        fetchRecentActivity(),
        fetchHighRiskClients()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Total clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Upcoming filings (next 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const { data: clients } = await supabase
        .from('clients')
        .select('registration_date, last_cipc_filed');

      let upcoming = 0;
      let overdue = 0;
      
      clients?.forEach(client => {
        if (client.registration_date) {
          const regDate = new Date(client.registration_date);
          const dueDate = new Date(today.getFullYear(), regDate.getMonth(), regDate.getDate());
          
          if (dueDate < today) {
            dueDate.setFullYear(today.getFullYear() + 1);
          }
          
          const lastFiled = client.last_cipc_filed ? new Date(client.last_cipc_filed) : null;
          const yearsSinceLastFiling = lastFiled 
            ? (today - lastFiled) / (1000 * 60 * 60 * 24 * 365) 
            : 999;

          if (yearsSinceLastFiling > 1) {
            if (dueDate < today) {
              overdue++;
            } else if (dueDate <= thirtyDaysFromNow) {
              upcoming++;
            }
          }
        }
      });

      // Documents
      let docCount = 0;
      try {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });
        docCount = count || 0;
      } catch (e) {
        console.log('Documents table not ready');
      }

      // Tasks
      let taskCount = 0;
      try {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('status', ['todo', 'in_progress']);
        taskCount = count || 0;
      } catch (e) {
        console.log('Tasks table not ready');
      }

      // Billing (if tables exist)
      let totalRevenue = 0;
      let pendingPayments = 0;
      
      try {
        const { data: billingData } = await supabase
          .from('billing_info')
          .select('amount, status');
        
        if (billingData) {
          totalRevenue = billingData
            .filter(b => b.status === 'paid')
            .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
          
          pendingPayments = billingData
            .filter(b => b.status === 'pending')
            .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        }
      } catch (e) {
        // Billing table might not exist yet
        console.log('Billing data not available yet');
      }

      setStats({
        totalClients: clientCount || 0,
        upcomingFilings: upcoming,
        overdueFilings: overdue,
        completedThisMonth: 0, // TODO: Calculate from filing_history
        totalRevenue: totalRevenue,
        pendingPayments: pendingPayments,
        documentsUploaded: docCount,
        activeTasks: taskCount
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchFilingStatus = async () => {
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('registration_date, last_cipc_filed');

      const today = new Date();
      let onTime = 0;
      let dueSoon = 0; // within 30 days
      let overdue = 0;
      let completed = 0;

      clients?.forEach(client => {
        if (client.registration_date) {
          const regDate = new Date(client.registration_date);
          const dueDate = new Date(today.getFullYear(), regDate.getMonth(), regDate.getDate());
          
          if (dueDate < today) {
            dueDate.setFullYear(today.getFullYear() + 1);
          }
          
          const lastFiled = client.last_cipc_filed ? new Date(client.last_cipc_filed) : null;
          const yearsSinceLastFiling = lastFiled 
            ? (today - lastFiled) / (1000 * 60 * 60 * 24 * 365) 
            : 999;

          if (yearsSinceLastFiling <= 1) {
            completed++;
          } else {
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue < 0) {
              overdue++;
            } else if (daysUntilDue <= 30) {
              dueSoon++;
            } else {
              onTime++;
            }
          }
        }
      });

      setFilingStatusData({ onTime, dueSoon, overdue, completed });
    } catch (error) {
      console.error('Error fetching filing status:', error);
    }
  };

  const fetchMonthlyTrends = async () => {
    // TODO: Implement monthly trends from filing_history table
    setMonthlyTrends([
      { month: 'Jan', filings: 12, revenue: 24000 },
      { month: 'Feb', filings: 15, revenue: 30000 },
      { month: 'Mar', filings: 18, revenue: 36000 },
      { month: 'Apr', filings: 14, revenue: 28000 },
      { month: 'May', filings: 20, revenue: 40000 },
      { month: 'Jun', filings: 22, revenue: 44000 }
    ]);
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(logs || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchHighRiskClients = async () => {
    try {
      // Get clients with overdue filings
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name, registration_number, registration_date, last_cipc_filed')
        .order('last_cipc_filed', { ascending: true });

      const today = new Date();
      const highRisk = clients?.filter(client => {
        const lastFiled = client.last_cipc_filed ? new Date(client.last_cipc_filed) : null;
        const yearsSinceLastFiling = lastFiled 
          ? (today - lastFiled) / (1000 * 60 * 60 * 24 * 365) 
          : 999;

        const regDate = new Date(client.registration_date);
        const dueDate = new Date(today.getFullYear(), regDate.getMonth(), regDate.getDate());
        
        if (dueDate < today) {
          dueDate.setFullYear(today.getFullYear() + 1);
        }

        return yearsSinceLastFiling > 1 && dueDate < today;
      }).slice(0, 5);

      setHighRiskClients(highRisk || []);
    } catch (error) {
      console.error('Error fetching high-risk clients:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, subtext }) => (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className={`text-sm font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <img 
                  src="/agility-logo.png" 
                  alt="Agility Logo" 
                  className="h-16 w-auto"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600">Real-time compliance and business insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            icon={Users}
            color="bg-blue-500"
            subtext="Active client accounts"
          />
          <StatCard
            title="Upcoming Filings"
            value={stats.upcomingFilings}
            icon={Clock}
            color="bg-orange-500"
            subtext="Due within 30 days"
          />
          <StatCard
            title="Overdue Filings"
            value={stats.overdueFilings}
            icon={AlertTriangle}
            color="bg-red-500"
            subtext="Requires immediate attention"
          />
          <StatCard
            title="Active Tasks"
            value={stats.activeTasks}
            icon={CheckCircle}
            color="bg-green-500"
            subtext="In progress or pending"
          />
        </div>

        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            color="bg-emerald-500"
            trend={12}
            subtext="Year to date"
          />
          <StatCard
            title="Pending Payments"
            value={formatCurrency(stats.pendingPayments)}
            icon={TrendingUp}
            color="bg-amber-500"
            subtext="Awaiting payment"
          />
          <StatCard
            title="Documents Stored"
            value={stats.documentsUploaded}
            icon={FileText}
            color="bg-purple-500"
            subtext="Total documents"
          />
        </div>

        {/* Filing Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Compliance Status Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Compliance Status</h2>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Completed</span>
                  <span className="text-sm font-bold text-green-600">{filingStatusData.completed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(filingStatusData.completed / stats.totalClients) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">On Time</span>
                  <span className="text-sm font-bold text-blue-600">{filingStatusData.onTime}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(filingStatusData.onTime / stats.totalClients) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Due Soon (30 days)</span>
                  <span className="text-sm font-bold text-orange-600">{filingStatusData.dueSoon}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(filingStatusData.dueSoon / stats.totalClients) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Overdue</span>
                  <span className="text-sm font-bold text-red-600">{filingStatusData.overdue}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(filingStatusData.overdue / stats.totalClients) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* High Risk Clients */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">High Risk Clients</h2>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            
            {highRiskClients.length > 0 ? (
              <div className="space-y-3">
                {highRiskClients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-semibold text-gray-900">{client.client_name}</p>
                      <p className="text-xs text-gray-600">{client.registration_number}</p>
                    </div>
                    <Link
                      to="/cipc"
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">No high-risk clients</p>
                <p className="text-sm text-gray-500">All filings are up to date!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <Link to="/management" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All →
            </Link>
          </div>
          
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.action_description}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/cipc"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow text-center"
          >
            <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Manage Filings</h3>
            <p className="text-sm text-gray-600">View and manage CIPC filings</p>
          </Link>

          <Link
            to="/customers"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow text-center"
          >
            <Users className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Client Management</h3>
            <p className="text-sm text-gray-600">Add or update client information</p>
          </Link>

          <Link
            to="/calendar"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow text-center"
          >
            <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Task Management</h3>
            <p className="text-sm text-gray-600">View and manage tasks</p>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default DashboardAnalytics;
