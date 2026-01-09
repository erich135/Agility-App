import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedCounter from './animations/AnimatedCounter';
import { SkeletonStats, SkeletonCard } from './animations/Skeletons';
import supabase from '../lib/SupabaseClient';
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
    activeClients: 0,
    recentDocuments: 0,
    upcomingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  const normalizeCount = (value) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return 0;
    const i = Math.trunc(n);
    return i > 0 ? i : 0;
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const recentDays = 30;
      const upcomingDays = 14;
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const recentSince = new Date(now);
      recentSince.setDate(recentSince.getDate() - recentDays);
      const upcomingUntil = new Date(now);
      upcomingUntil.setDate(upcomingUntil.getDate() + upcomingDays);
      const upcomingUntilStr = upcomingUntil.toISOString().slice(0, 10);

      // Active Clients: simplest possible — count rows in clients table.
      // (Avoids status casing issues and any oddities with head/count-only requests.)
      let activeClients = 0;
      {
        const { data, error } = await supabase
          .from('clients')
          .select('id');

        if (error) {
          console.warn('Clients count error:', error);
          activeClients = 0;
        } else {
          activeClients = normalizeCount(data?.length ?? 0);
        }
      }

      // Documents: simplest possible — count rows in documents table.
      let recentDocuments = 0;
      {
        const { data, error } = await supabase
          .from('documents')
          .select('id');

        if (error) {
          console.warn('Documents count error:', error);
          recentDocuments = 0;
        } else {
          recentDocuments = normalizeCount(data?.length ?? 0);
        }
      }

      // Upcoming Tasks (next 14 days). If tasks table is missing/blocked, fall back to active projects.
      let upcomingTasks = 0;
      {
        const { count, error } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .gte('due_date', todayStr)
          .lte('due_date', upcomingUntilStr);

        if (!error) {
          upcomingTasks = normalizeCount(count);
        } else {
          console.warn('Tasks count error (falling back to projects):', error);
          const { count: projectCount, error: projectError } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .in('status', ['active', 'on_hold']);
          if (projectError) {
            console.warn('Fallback project count error:', projectError);
          }
          upcomingTasks = normalizeCount(projectCount);
        }
      }

      setStats({ activeClients, recentDocuments, upcomingTasks });
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
      title: 'Timesheet',
      description: 'Log time and manage entries',
      icon: Clock,
      link: '/timesheet',
      color: 'bg-blue-500',
      permission: 'access_timesheet'
    },
    {
      title: 'My Timesheets',
      description: 'View and manage your time entries',
      icon: Clock,
      link: '/my-timesheets',
      color: 'bg-indigo-500',
      permission: 'access_my_timesheets'
    },
    {
      title: 'Projects',
      description: 'Manage projects and assignments',
      icon: Briefcase,
      link: '/projects',
      color: 'bg-purple-500',
      permission: 'access_projects'
    },
    {
      title: 'Billing Dashboard',
      description: 'View billing dashboard',
      icon: Banknote,
      link: '/billing/dashboard',
      color: 'bg-green-500',
      permission: 'access_billing_dashboard'
    },
    {
      title: 'Billing Reports',
      description: 'View billing reports and analytics',
      icon: TrendingUp,
      link: '/billing/reports',
      color: 'bg-emerald-500',
      permission: 'access_billing_reports'
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                <AnimatedCounter value={stats.activeClients} duration={800} />
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Documents</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                <AnimatedCounter value={stats.recentDocuments} duration={900} />
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Upcoming Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                <AnimatedCounter value={stats.upcomingTasks} duration={1000} />
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-600" />
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
    </div>
  );
};

export default HomePage;
