import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProjectService, ReportingService, TimeEntryService } from '../services/TimesheetService';
import AnimatedCounter from './animations/AnimatedCounter';
import { SkeletonStats, SkeletonCard } from './animations/Skeletons';
import {
  Clock,
  Banknote,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  ArrowRight
} from 'lucide-react';

const HomePage = () => {
  const { user, hasPermission, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    activeProjects: 0,
    hoursThisWeek: 0,
    billableHours: 0,
    pendingInvoices: 0,
    overdueCount: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get projects
      const projectsRes = await ProjectService.getAll();
      const projects = projectsRes.data || [];

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const activeProjects = projects.filter(p => p.status === 'active').length;
      const pendingInvoices = projects.filter(p => p.status === 'ready_to_bill').length;
      const overdueCount = projects.filter(p => {
        if (p.status === 'invoiced' || !p.billing_date) return false;
        return new Date(p.billing_date) < today;
      }).length;

      setStats({
        activeProjects,
        hoursThisWeek: 0, // Would need time entries query
        billableHours: 0,
        pendingInvoices,
        overdueCount
      });

      // Recent projects (last 5)
      setRecentProjects(projects.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      title: 'Log Time',
      description: 'Start tracking time on a project',
      icon: Clock,
      link: '/timesheet',
      color: 'bg-blue-500',
      permission: 'access_timesheet'
    },
    {
      title: 'New Project',
      description: 'Create a new client project',
      icon: Briefcase,
      link: '/projects',
      color: 'bg-purple-500',
      permission: 'access_projects'
    },
    {
      title: 'Billing',
      description: 'View projects ready to bill',
      icon: Banknote,
      link: '/billing',
      color: 'bg-green-500',
      permission: 'access_billing_dashboard'
    },
    {
      title: 'Calendar',
      description: 'View tasks and deadlines',
      icon: Calendar,
      link: '/calendar',
      color: 'bg-orange-500',
      permission: 'access_calendar'
    }
  ].filter(action => !action.permission || hasPermission(action.permission));

  if (loading) {
    return (
      <div className="space-y-6 animate-page-in">
        {/* Skeleton Header */}
        <div className="skeleton h-40 rounded-2xl"></div>
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <SkeletonStats key={i} className="h-24" />)}
        </div>
        {/* Skeleton Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white animate-gradient animate-card-enter">
        <h1 className="text-3xl font-bold mb-2">
          {getGreeting()}, {user?.first_name || user?.full_name || 'User'}! 👋
        </h1>
        <p className="text-blue-100 text-lg">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Alert Banner for Overdue */}
      {stats.overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 animate-card-enter overdue-pulse">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800">
              {stats.overdueCount} overdue billing{stats.overdueCount > 1 ? 's' : ''} need attention!
            </p>
            <p className="text-sm text-red-600">Review and process these as soon as possible.</p>
          </div>
          <Link 
            to="/billing"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors btn-animated hover-lift"
          >
            View Now
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Projects</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                <AnimatedCounter value={stats.activeProjects} duration={800} />
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Invoices</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                <AnimatedCounter value={stats.pendingInvoices} duration={900} />
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Banknote className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Hours This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Overdue</p>
              <p className={`text-3xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                <AnimatedCounter value={stats.overdueCount} duration={1000} />
              </p>
            </div>
            <div className={`p-3 rounded-xl ${stats.overdueCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              {stats.overdueCount > 0 ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group hover-lift card-shine animate-card-enter stagger-${index + 1}`}
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-500">{action.description}</p>
              <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                Go <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-card-enter stagger-5">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700 font-medium btn-animated">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentProjects.map((project, index) => (
              <div key={project.id} className={`px-6 py-4 hover:bg-gray-50 transition-colors animate-row`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.client?.client_name || 'No client'}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    project.status === 'ready_to_bill' ? 'bg-yellow-100 text-yellow-700' :
                    project.status === 'invoiced' ? 'bg-green-100 text-green-700' :
                    project.status === 'on_hold' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
