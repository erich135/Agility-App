import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    activeClients: 0,
    recentDocuments: 0,
    upcomingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Minimal stats – no projects fetching
      setStats({
        activeClients: 0,
        recentDocuments: 0,
        upcomingTasks: 0
      });
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
      title: 'Billing',
      description: 'View billing dashboard',
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
              <p className="text-sm text-gray-500 font-medium">Recent Documents</p>
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
