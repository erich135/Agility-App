import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, Clock, X, CheckCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectService } from '../services/TimesheetService';

export default function BillingNotifications() {
  const { user, hasPermission } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkBillingReminders();
      // Check every 5 minutes
      const interval = setInterval(checkBillingReminders, 300000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkBillingReminders = async () => {
    try {
      setLoading(true);
      const { data: projects, error } = await ProjectService.getAll();
      
      if (error || !projects) {
        setNotifications([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const reminders = [];

      projects.forEach(project => {
        // Skip invoiced projects
        if (project.status === 'Invoiced') return;

        // Check expected billing date
        if (project.expected_billing_date) {
          const billingDate = new Date(project.expected_billing_date);
          billingDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((billingDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntil < 0) {
            // Overdue
            reminders.push({
              id: `overdue-${project.id}`,
              type: 'overdue',
              priority: 'urgent',
              title: 'OVERDUE: Billing Past Due',
              message: `${project.project_name} billing was due ${Math.abs(daysUntil)} day(s) ago`,
              project: project,
              daysUntil: daysUntil,
              date: project.expected_billing_date
            });
          } else if (daysUntil === 0) {
            // Due today
            reminders.push({
              id: `today-${project.id}`,
              type: 'due_today',
              priority: 'high',
              title: 'DUE TODAY: Billing Due',
              message: `${project.project_name} billing is due today!`,
              project: project,
              daysUntil: daysUntil,
              date: project.expected_billing_date
            });
          } else if (daysUntil <= 3) {
            // Due within 3 days
            reminders.push({
              id: `soon-${project.id}`,
              type: 'due_soon',
              priority: 'medium',
              title: 'Billing Due Soon',
              message: `${project.project_name} billing due in ${daysUntil} day(s)`,
              project: project,
              daysUntil: daysUntil,
              date: project.expected_billing_date
            });
          } else if (daysUntil <= 7) {
            // Due within a week
            reminders.push({
              id: `upcoming-${project.id}`,
              type: 'upcoming',
              priority: 'low',
              title: 'Upcoming Billing',
              message: `${project.project_name} billing due in ${daysUntil} day(s)`,
              project: project,
              daysUntil: daysUntil,
              date: project.expected_billing_date
            });
          }
        }

        // Check completed projects without invoice
        if (project.status === 'Completed' && !project.invoice_number) {
          const completedDate = new Date(project.completion_date || project.updated_at);
          const daysSinceCompletion = Math.ceil((today - completedDate) / (1000 * 60 * 60 * 24));
          
          if (daysSinceCompletion >= 2) {
            reminders.push({
              id: `completed-${project.id}`,
              type: 'pending_invoice',
              priority: daysSinceCompletion > 7 ? 'high' : 'medium',
              title: 'Invoice Pending',
              message: `${project.project_name} completed ${daysSinceCompletion} day(s) ago - needs invoice`,
              project: project,
              daysUntil: -daysSinceCompletion,
              date: project.completion_date
            });
          }
        }
      });

      // Sort by priority and date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      reminders.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.daysUntil - b.daysUntil;
      });

      setNotifications(reminders);
    } catch (error) {
      console.error('Error checking billing reminders:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationStyle = (notification) => {
    switch (notification.priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50 border-red-300',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          badge: 'bg-red-600'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 border-orange-300',
          icon: <Clock className="w-5 h-5 text-orange-600" />,
          badge: 'bg-orange-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 border-yellow-300',
          icon: <Calendar className="w-5 h-5 text-yellow-600" />,
          badge: 'bg-yellow-500'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-300',
          icon: <DollarSign className="w-5 h-5 text-blue-600" />,
          badge: 'bg-blue-500'
        };
    }
  };

  const urgentCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length;
  const totalCount = notifications.length;

  // Only show for users with billing permissions
  if (!hasPermission || (!hasPermission('access_billing_dashboard') && !hasPermission('manage_users'))) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg transition-colors"
        title="Billing Reminders"
      >
        <DollarSign className="w-6 h-6" />
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white rounded-full ${urgentCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">Billing Reminders</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {urgentCount > 0 && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  ⚠️ {urgentCount} urgent item(s) need attention!
                </p>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">All caught up!</p>
                  <p className="text-gray-500 text-sm">No pending billing reminders</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const style = getNotificationStyle(notification);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 ${style.bg} border-l-4 hover:bg-opacity-75 transition-colors cursor-pointer`}
                        onClick={() => {
                          // Could navigate to billing dashboard
                          window.location.href = '/billing';
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {style.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500">
                                {notification.project?.client?.business_name || 'Unknown Client'}
                              </span>
                              {notification.date && (
                                <span className="text-xs text-gray-400">
                                  • {new Date(notification.date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <a
                  href="/billing"
                  className="block text-center text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  View All in Billing Dashboard →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
