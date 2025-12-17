import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Clock,
  FileText,
  Briefcase,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Calendar,
  FolderOpen,
  ClipboardList,
  Shield,
  Menu
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu items grouped by category
  const menuGroups = [
    {
      title: 'Main',
      items: [
        { 
          path: '/', 
          icon: Home, 
          label: 'Dashboard',
          permission: null // Everyone can see
        },
      ]
    },
    {
      title: 'Core',
      items: [
        { 
          path: '/customers', 
          icon: Users, 
          label: 'Customers',
          permission: 'access_customers'
        },
        { 
          path: '/cipc', 
          icon: Building2, 
          label: 'CIPC',
          permission: 'access_cipc'
        },
        { 
          path: '/calendar', 
          icon: Calendar, 
          label: 'Calendar',
          permission: 'access_calendar'
        },
        { 
          path: '/documents', 
          icon: FolderOpen, 
          label: 'Documents',
          permission: 'access_documents'
        },
      ]
    },
    {
      title: 'Timesheet',
      items: [
        { 
          path: '/timesheet', 
          icon: Clock, 
          label: 'Log Time',
          permission: 'access_timesheet'
        },
        { 
          path: '/my-timesheets', 
          icon: ClipboardList, 
          label: 'My Timesheets',
          permission: 'access_my_timesheets'
        },
        { 
          path: '/projects', 
          icon: Briefcase, 
          label: 'Projects',
          permission: 'access_projects'
        },
      ]
    },
    {
      title: 'Billing',
      items: [
        { 
          path: '/billing', 
          icon: DollarSign, 
          label: 'Billing Dashboard',
          permission: 'access_billing_dashboard'
        },
        { 
          path: '/billing/reports', 
          icon: BarChart3, 
          label: 'Billing Reports',
          permission: 'access_billing_reports'
        },
      ]
    },
    {
      title: 'Financial',
      items: [
        { 
          path: '/financial-statements', 
          icon: FileText, 
          label: 'Financial Statements',
          permission: 'access_financial_statements'
        },
      ]
    },
    {
      title: 'Admin',
      items: [
        { 
          path: '/settings/users', 
          icon: Shield, 
          label: 'User Management',
          permission: 'manage_users',
          adminOnly: true
        },
      ]
    }
  ];

  // Filter menu items based on permissions
  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && !isAdmin()) return false;
      if (!item.permission) return true;
      return hasPermission(item.permission);
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-slate-900 text-white transition-all duration-300 z-50 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className={`p-4 border-b border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img 
              src="/agility-logo.png" 
              alt="Agility" 
              className="h-8 w-auto brightness-0 invert"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="font-bold text-lg">Agility</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            {!isCollapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            <ul className="space-y-1 px-2">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : ''}`
                    }
                    title={isCollapsed ? item.label : ''}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-700 p-4">
        {!isCollapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || user?.first_name || user?.email}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            {isAdmin() && (
              <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium bg-green-600/20 text-green-400 rounded">
                Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
