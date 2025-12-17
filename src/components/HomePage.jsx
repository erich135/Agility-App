import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import NotificationCenter from './NotificationCenter';

const HomePage = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <img 
              src="/agility-logo.png" 
              alt="Agility Logo" 
              className="h-16 w-auto"
            />
            
            {/* User Info, Notifications & Logout */}
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-semibold text-gray-900">{user?.full_name || user?.email}</p>
                {isAdmin() && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Administrator
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Agility Management System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive client management and CIPC filing system for accountancy professionals
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="mb-12">
          <Link 
            to="/dashboard"
            className="block bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">📊 Analytics Dashboard</h2>
                <p className="text-blue-100 text-lg">View comprehensive compliance reports, revenue tracking, and business insights</p>
              </div>
              <svg 
                className="w-12 h-12 text-white animate-bounce" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Navigation Cards */}
        <div className={`grid gap-8 max-w-6xl mx-auto ${isAdmin() ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* CIPC Card */}
          <Link 
            to="/cipc" 
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">CIPC Management</h2>
              <p className="text-gray-600 leading-relaxed">
                Manage CIPC annual returns, track filing deadlines, and monitor compliance status for all your clients.
              </p>
              <div className="mt-6 flex items-center text-blue-500 group-hover:text-blue-600">
                <span className="font-medium">Access CIPC System</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Customers Card */}
          <Link 
            to="/customers" 
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Customer Management</h2>
              <p className="text-gray-600 leading-relaxed">
                Comprehensive client database with company details, documents, director information, and audit trails.
              </p>
              <div className="mt-6 flex items-center text-green-500 group-hover:text-green-600">
                <span className="font-medium">Manage Customers</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Calendar & Tasks Card */}
          <Link 
            to="/calendar" 
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Calendar & Tasks</h2>
              <p className="text-gray-600 leading-relaxed">
                Task management, calendar scheduling, deadline tracking, and business workflow organization.
              </p>
              <div className="mt-6 flex items-center text-blue-500 group-hover:text-blue-600">
                <span className="font-medium">Manage Schedule</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Timesheet & Billing Card - NEW */}
          <Link
            to="/timesheet"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ring-2 ring-green-400 ring-offset-2"
          >
            <div className="p-8 relative">
              <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                NEW
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-6 group-hover:from-green-600 group-hover:to-emerald-700 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Timesheet & Billing</h2>
              <p className="text-gray-600 leading-relaxed">
                Track billable hours with timer or manual entry. Project management, invoicing workflow, and comprehensive reports.
              </p>
              <div className="mt-6 flex items-center text-green-500 group-hover:text-green-600">
                <span className="font-medium">Track Time</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Financial Statements Card */}
          <Link
            to="/financial-statements"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center mb-6 group-hover:from-teal-600 group-hover:to-green-600 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Financial Statements</h2>
              <p className="text-gray-600 leading-relaxed">
                Generate South African compliant annual financial statements from trial balance data. IFRS for SMEs compliance.
              </p>
              <div className="mt-6 flex items-center text-teal-500 group-hover:text-teal-600">
                <span className="font-medium">Generate Statements</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* My Timesheets Card */}
          <Link
            to="/my-timesheets"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mb-6 group-hover:from-amber-600 group-hover:to-orange-700 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">My Timesheets</h2>
              <p className="text-gray-600 leading-relaxed">
                View, edit, and manage your personal time entries. Track hours logged and billable status.
              </p>
              <div className="mt-6 flex items-center text-amber-500 group-hover:text-amber-600">
                <span className="font-medium">View Entries</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Project Management Card */}
          <Link
            to="/projects"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-6 group-hover:from-indigo-600 group-hover:to-purple-700 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6V4m6 2a9 9 0 11-18 0 9 9 0 0118 0zM12 9v3m0 0v3" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Projects</h2>
              <p className="text-gray-600 leading-relaxed">
                Create and manage client projects. Track job types, billing dates, and project status.
              </p>
              <div className="mt-6 flex items-center text-indigo-500 group-hover:text-indigo-600">
                <span className="font-medium">Manage Projects</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Billing Dashboard Card */}
          <Link
            to="/billing"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-6 group-hover:from-emerald-600 group-hover:to-teal-700 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Billing Dashboard</h2>
              <p className="text-gray-600 leading-relaxed">
                Track completed projects, billable hours, and manage invoice creation for the accounts team.
              </p>
              <div className="mt-6 flex items-center text-emerald-500 group-hover:text-emerald-600">
                <span className="font-medium">View Dashboard</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Billing Reports Card */}
          <Link
            to="/reports"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center mb-6 group-hover:from-pink-600 group-hover:to-rose-700 transition-colors">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Billing Reports</h2>
              <p className="text-gray-600 leading-relaxed">
                Comprehensive billing analytics with charts, filters, and export capabilities. CSV downloads available.
              </p>
              <div className="mt-6 flex items-center text-pink-500 group-hover:text-pink-600">
                <span className="font-medium">View Reports</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Management Card - Admin Only */}
          {isAdmin() && (
            <Link 
              to="/management" 
              className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                  <svg 
                    className="w-8 h-8 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">System Management</h2>
                <p className="text-gray-600 leading-relaxed">
                  Admin panel for user management, system settings, and administrative functions.
                </p>
                <div className="mt-6 flex items-center text-purple-500 group-hover:text-purple-600">
                  <span className="font-medium">Admin Panel</span>
                  <svg 
                    className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Features Overview */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold text-gray-800 mb-8">Key Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Compliance Tracking</h4>
              <p className="text-gray-600">Monitor filing deadlines and ensure regulatory compliance</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Document Management</h4>
              <p className="text-gray-600">Securely store and manage client documents</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure Access</h4>
              <p className="text-gray-600">Role-based access with OTP authentication</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Agility Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;