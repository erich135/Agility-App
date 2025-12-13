import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, AlertTriangle, Info, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../App';
import NotificationService from '../lib/NotificationService';

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userType = user.role === 'admin' || user.role === 'user' ? 'director' : 'client';
      const data = await NotificationService.getNotifications(user.id, userType, 50);
      
      setNotifications(data);
      
      const unread = data.filter(n => 
        n.status === 'delivered' || n.status === 'sent'
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      // Silently handle error if notifications table doesn't exist yet
      if (!error.message?.includes('does not exist')) {
        console.error('Error fetching notifications:', error);
      }
      // Set empty state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => 
        n.status === 'delivered' || n.status === 'sent'
      );
      
      for (const notification of unreadNotifications) {
        await NotificationService.markAsRead(notification.id);
      }
      
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (notification) => {
    if (notification.subject?.includes('URGENT') || notification.subject?.includes('Overdue')) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (notification.subject?.includes('Due') || notification.subject?.includes('Reminder')) {
      return <Calendar className="w-5 h-5 text-orange-500" />;
    }
    if (notification.subject?.includes('Document')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <Info className="w-5 h-5 text-gray-500" />;
  };

  const getNotificationColor = (notification) => {
    if (notification.subject?.includes('URGENT') || notification.subject?.includes('Overdue')) {
      return 'bg-red-50 border-red-200';
    }
    if (notification.subject?.includes('Due') || notification.subject?.includes('Reminder')) {
      return 'bg-orange-50 border-orange-200';
    }
    return 'bg-blue-50 border-blue-200';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') {
      return n.status === 'delivered' || n.status === 'sent';
    }
    if (filter === 'read') {
      return n.status === 'read';
    }
    return true;
  });

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'unread'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'read'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Read
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredNotifications.map(notification => {
                    const isUnread = notification.status === 'delivered' || notification.status === 'sent';
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isUnread ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => isUnread && markAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {notification.subject && (
                              <p className={`text-sm font-semibold text-gray-900 mb-1 ${
                                isUnread ? 'font-bold' : ''
                              }`}>
                                {notification.subject}
                              </p>
                            )}
                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {isUnread && (
                                <span className="flex items-center text-xs text-blue-600 font-medium">
                                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-1"></span>
                                  New
                                </span>
                              )}
                            </div>
                          </div>

                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">No notifications</p>
                  <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page
                  }}
                  className="w-full text-sm text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
