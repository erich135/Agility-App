import React, { useState, useEffect } from 'react';
import CalendarTaskService from '../lib/CalendarTaskService';
import Calendar from './Calendar';
import UserSelector from './ui/UserSelector';
import TaskDetailModal from './ui/TaskDetailModal';
import EventDetailModal from './ui/EventDetailModal';
import { useAuth } from '../contexts/AuthContext';

const CalendarTaskManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({});

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Document deadlines
  const [documentDeadlines, setDocumentDeadlines] = useState([]);
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form states
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    taskType: 'general',
    priority: 'medium',
    dueDate: '',
    clientId: '',
    assignees: [] // Array of selected users
  });

  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    eventType: 'meeting',
    startTime: '',
    endTime: '',
    location: '',
    clientId: '',
    attendees: [] // Array of selected users
  });

  // Modal states
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Temporarily use mock data instead of API calls
      console.log('Loading dashboard with mock data...');
      
      // Mock dashboard stats
      setDashboardStats({
        tasks: { pending: 3, overdue: 1 },
        deadlines: { thisWeek: 2 },
        calendar: { todayEvents: 1 }
      });

      // Mock tasks
      setTasks([
        {
          id: '1',
          title: 'Review Client Onboarding Process',
          description: 'Review and update workflow',
          task_type: 'general',
          priority: 'medium',
          status: 'pending',
          due_date: '2025-11-15T10:00:00Z',
          created_at: '2025-11-10T08:00:00Z'
        },
        {
          id: '2', 
          title: 'CIPC Filing Deadline',
          description: 'File annual returns',
          task_type: 'filing_deadline',
          priority: 'urgent',
          status: 'in_progress',
          due_date: '2025-11-12T17:00:00Z',
          created_at: '2025-11-09T09:00:00Z'
        }
      ]);

      // Mock deadlines
      setDocumentDeadlines([
        {
          id: '1',
          document_type: 'vat_return',
          deadline_date: '2025-11-17',
          description: 'VAT Return Filing Due',
          status: 'pending',
          priority: 'high',
          created_at: '2025-11-10T08:00:00Z'
        }
      ]);

      // Mock calendar events
      setCalendarEvents([
        {
          id: '1',
          title: 'Client Consultation',
          description: 'Meeting with ABC Corp',
          event_type: 'appointment',
          start_time: '2025-11-11T09:00:00Z',
          end_time: '2025-11-11T10:00:00Z',
          location: 'Conference Room A',
          created_at: '2025-11-10T08:00:00Z'
        },
        {
          id: '2',
          title: 'Team Planning Meeting',
          description: 'Weekly team sync',
          event_type: 'meeting',
          start_time: '2025-11-12T14:00:00Z',
          end_time: '2025-11-12T15:00:00Z',
          location: 'Main Office',
          created_at: '2025-11-10T08:00:00Z'
        },
        {
          id: '3',
          title: 'VAT Filing Deadline',
          description: 'Submit VAT returns',
          event_type: 'deadline',
          start_time: '2025-11-15T17:00:00Z',
          end_time: '2025-11-15T17:00:00Z',
          location: 'Online',
          created_at: '2025-11-10T08:00:00Z'
        },
        {
          id: '4',
          title: 'Client Follow-up Call',
          description: 'Check on document status',
          event_type: 'reminder',
          start_time: '2025-11-13T10:30:00Z',
          end_time: '2025-11-13T11:00:00Z',
          location: 'Phone',
          created_at: '2025-11-10T08:00:00Z'
        },
        {
          id: '5',
          title: 'New Client Onboarding',
          description: 'Welcome meeting for DEF Corp',
          event_type: 'appointment',
          start_time: '2025-11-14T11:00:00Z',
          end_time: '2025-11-14T12:00:00Z',
          location: 'Conference Room B',
          created_at: '2025-11-10T08:00:00Z'
        }
      ]);

      console.log('Mock data loaded successfully');
      
      /* ORIGINAL API CALLS - COMMENTED OUT UNTIL DB IS FIXED
      // Load dashboard stats
      const statsResult = await CalendarTaskService.getDashboardStats(user?.id);
      if (statsResult.success) {
        setDashboardStats(statsResult.stats);
      }

      // Load tasks
      const tasksResult = await CalendarTaskService.getTasks({ limit: 20 });
      if (tasksResult.success) {
        setTasks(tasksResult.tasks);
      }

      // Load upcoming deadlines
      const deadlinesResult = await CalendarTaskService.getDocumentDeadlines({ daysAhead: 30 });
      if (deadlinesResult.success) {
        setDocumentDeadlines(deadlinesResult.deadlines);
      }

      // Load this month's calendar events
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const eventsResult = await CalendarTaskService.getCalendarEvents({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString()
      });
      
      if (eventsResult.success) {
        setCalendarEvents(eventsResult.events);
      }
      */

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId, newStatus) => {
    try {
      // First update the UI optimistically
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      // Try to update via API
      const result = await CalendarTaskService.updateTask(
        taskId, 
        { status: newStatus }, 
        user?.id
      );
      
      if (!result.success) {
        // Revert the optimistic update if API fails
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: task.status } : task
        ));
        console.error('Failed to update task status:', result.error);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      // The UI already shows the updated status optimistically
      // In a real app, you might want to show an error message and revert
    }
  };

  const handleCompleteDeadline = async (deadlineId) => {
    try {
      const result = await CalendarTaskService.completeDocumentDeadline(deadlineId, user?.id);
      
      if (result.success) {
        setDocumentDeadlines(prev => prev.map(deadline => 
          deadline.id === deadlineId ? result.deadline : deadline
        ));
      }
    } catch (err) {
      console.error('Error completing deadline:', err);
    }
  };

  // Form handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      // Temporarily use mock success instead of API call
      console.log('Creating task with mock success...', taskFormData);
      
      // Mock successful task creation
      const mockTask = {
        id: Date.now().toString(),
        title: taskFormData.title,
        description: taskFormData.description,
        task_type: taskFormData.taskType,
        priority: taskFormData.priority,
        due_date: taskFormData.dueDate,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      setTasks(prev => [mockTask, ...prev]);
      setTaskFormData({
        title: '',
        description: '',
        taskType: 'general',
        priority: 'medium',
        dueDate: '',
        clientId: '',
        assignees: []
      });
      setShowTaskForm(false);
      
      // Update dashboard stats
      setDashboardStats(prev => ({
        ...prev,
        tasks: { ...prev.tasks, pending: (prev.tasks?.pending || 0) + 1 }
      }));
      
      console.log('Mock task created successfully');

      /* ORIGINAL API CALL - COMMENTED OUT
      const result = await CalendarTaskService.createTask({
        title: taskFormData.title,
        description: taskFormData.description,
        taskType: taskFormData.taskType,
        priority: taskFormData.priority,
        dueDate: taskFormData.dueDate || null,
        assignees: taskFormData.assignees.map(user => user.id),
        clientId: taskFormData.clientId || null,
        createdBy: user?.id
      });

      if (result.success) {
        setTasks(prev => [result.task, ...prev]);
        setTaskFormData({
          title: '',
          description: '',
          taskType: 'general',
          priority: 'medium',
          dueDate: '',
          clientId: '',
          assignees: []
        });
        setShowTaskForm(false);
        await loadDashboardData(); // Refresh dashboard stats
      }
      */
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const result = await CalendarTaskService.createCalendarEvent({
        title: eventFormData.title,
        description: eventFormData.description,
        eventType: eventFormData.eventType,
        startTime: eventFormData.startTime,
        endTime: eventFormData.endTime,
        location: eventFormData.location,
        attendees: eventFormData.attendees.map(user => user.id),
        clientId: eventFormData.clientId || null,
        createdBy: user?.id
      });

      if (result.success) {
        setCalendarEvents(prev => [...prev, result.event]);
        setEventFormData({
          title: '',
          description: '',
          eventType: 'meeting',
          startTime: '',
          endTime: '',
          location: '',
          clientId: '',
          attendees: []
        });
        setShowEventForm(false);
        await loadDashboardData(); // Refresh dashboard stats
      }
    } catch (err) {
      console.error('Error creating event:', err);
    }
  };

  // Utility function to validate and sanitize task data
  const validateTask = (task) => {
    if (!task || typeof task !== 'object') return null;
    
    return {
      id: task.id || '',
      title: task.title || 'Untitled Task',
      description: task.description || '',
      task_type: task.task_type || 'general',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      due_date: task.due_date || null,
      created_at: task.created_at || new Date().toISOString(),
      client_id: task.client_id || null,
      assigned_to: task.assigned_to || null
    };
  };

  // Utility function to validate and sanitize deadline data
  const validateDeadline = (deadline) => {
    if (!deadline || typeof deadline !== 'object') return null;
    
    return {
      id: deadline.id || '',
      document_type: deadline.document_type || 'unknown',
      deadline_date: deadline.deadline_date || new Date().toISOString().split('T')[0],
      description: deadline.description || 'No description',
      status: deadline.status || 'pending',
      priority: deadline.priority || 'medium',
      created_at: deadline.created_at || new Date().toISOString(),
      client_id: deadline.client_id || null
    };
  };

  const getPriorityBadgeClasses = (priority) => {
    try {
      const config = CalendarTaskService.getTaskPriorityConfig();
      const priorityConfig = config[priority] || config['medium']; // fallback to medium
      return `inline-flex px-2 py-1 text-xs font-medium rounded-full ${priorityConfig.bgColor} ${priorityConfig.textColor}`;
    } catch (error) {
      console.error('Error getting priority badge classes:', error);
      return 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-800';
    }
  };

  const getStatusBadgeClasses = (status) => {
    try {
      const config = CalendarTaskService.getTaskStatusConfig();
      const statusConfig = config[status] || config['pending']; // fallback to pending
      return `inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`;
    } catch (error) {
      console.error('Error getting status badge classes:', error);
      return 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-800';
    }
  };

  // Click handlers for tasks and events
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus }
          : task
      )
    );
    // Refresh dashboard stats
    loadDashboardData();
  };

  const handleTaskEdit = (task) => {
    if (!task) return; // Guard clause for null task
    
    setEditingTask(task);
    setTaskFormData({
      title: task?.title || '',
      description: task?.description || '',
      taskType: task?.task_type || 'general',
      priority: task?.priority || 'medium',
      dueDate: task?.due_date ? task.due_date.slice(0, 16) : '',
      clientId: task?.client_id || '',
      assignees: [] // TODO: Load existing assignees
    });
    setShowTaskForm(true);
    setShowTaskModal(false);
  };

  const handleEventEdit = (event) => {
    if (!event) return; // Guard clause for null event
    
    setEventFormData({
      title: event?.title || '',
      description: event?.description || '',
      eventType: event?.event_type || 'meeting',
      startTime: event?.start_time ? event.start_time.slice(0, 16) : '',
      endTime: event?.end_time ? event.end_time.slice(0, 16) : '',
      location: event?.location || '',
      clientId: event?.client_id || '',
      attendees: [] // TODO: Load existing attendees
    });
    setShowEventForm(true);
    setShowEventModal(false);
  };

  const handleTaskDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await CalendarTaskService.deleteTask(taskId, user?.id);
        setTasks(prev => prev.filter(task => task.id !== taskId));
        setShowTaskModal(false);
        loadDashboardData();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleEventDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await CalendarTaskService.deleteCalendarEvent(eventId, user?.id);
        setCalendarEvents(prev => prev.filter(event => event.id !== eventId));
        setShowEventModal(false);
        loadDashboardData();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar and tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">📅 Calendar & Tasks</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <span className="mr-2">+</span>
                New Task
              </button>
              <button
                onClick={() => setShowEventForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <span className="mr-2">📅</span>
                New Event
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: '📊' },
              { id: 'tasks', name: 'Tasks', icon: '✅' },
              { id: 'calendar', name: 'Calendar', icon: '📅' },
              { id: 'deadlines', name: 'Deadlines', icon: '⚠️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">✅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.tasks?.pending || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">🔥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Overdue Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.tasks?.overdue || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week's Deadlines</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.deadlines?.thisWeek || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">📅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Events</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.calendar?.todayEvents || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Tasks and Upcoming Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Tasks */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Tasks</h3>
                </div>
                <div className="p-6">
                  {tasks.filter(task => task && task.id).slice(0, 5).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tasks found</p>
                  ) : (
                    <div className="space-y-4">
                      {tasks
                        .filter(task => task && task.id)
                        .slice(0, 5)
                        .map(task => validateTask(task))
                        .filter(task => task)
                        .map((task) => {
                          // Direct safety check
                          if (!task || !task.id || typeof task !== 'object') {
                            return null;
                          }
                          
                          return (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{task?.title || 'Untitled Task'}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={getPriorityBadgeClasses(task?.priority || 'medium')}>
                                {task?.priority || 'medium'}
                              </span>
                              <span className={getStatusBadgeClasses(task?.status || 'pending')}>
                                {CalendarTaskService.getTaskStatusConfig()[task?.status || 'pending']?.label || task?.status}
                              </span>
                              {task?.due_date && (
                                <span className="text-xs text-gray-500">
                                  Due: {CalendarTaskService.formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          {task?.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskStatusUpdate(task.id, 'completed');
                              }}
                              className="ml-4 text-green-600 hover:text-green-800"
                              title="Mark as completed"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                          );
                        }).filter(Boolean)}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Upcoming Deadlines</h3>
                </div>
                <div className="p-6">
                  {documentDeadlines.filter(deadline => deadline && deadline.id).slice(0, 5).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
                  ) : (
                    <div className="space-y-4">
                      {documentDeadlines
                        .filter(deadline => deadline && deadline.id)
                        .slice(0, 5)
                        .map(deadline => validateDeadline(deadline))
                        .filter(deadline => deadline)
                        .map((deadline) => (
                        <div key={deadline.id} className={`p-3 border rounded-lg ${
                          CalendarTaskService.isOverdue(deadline.deadline_date) ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{deadline.description}</p>
                              <p className="text-sm text-gray-600">
                                {deadline.client?.client_name} - {deadline.document_type.replace('_', ' ')}
                              </p>
                              <p className={`text-xs ${
                                CalendarTaskService.isOverdue(deadline.deadline_date) ? 'text-red-600 font-bold' : 'text-gray-500'
                              }`}>
                                {CalendarTaskService.isOverdue(deadline.deadline_date) ? '⚠️ OVERDUE: ' : 'Due: '}
                                {CalendarTaskService.formatDate(deadline.deadline_date)}
                              </p>
                            </div>
                            {deadline?.status === 'pending' && (
                              <button
                                onClick={() => handleCompleteDeadline(deadline.id)}
                                className="ml-4 text-green-600 hover:text-green-800"
                                title="Mark as completed"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Task Management</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Full task management interface will be implemented here.</p>
              <div className="space-y-4">
                {tasks
                  .filter(task => task && task.id)
                  .map(task => validateTask(task))
                  .filter(task => task)
                  .map((task) => (
                  <div 
                    key={task.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task?.title || 'Untitled Task'}</h4>
                        {task?.description && (
                          <p className="text-gray-600 text-sm mt-1">{task?.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={getPriorityBadgeClasses(task?.priority || 'medium')}>
                            {task?.priority || 'medium'}
                          </span>
                          <span className={getStatusBadgeClasses(task?.status || 'pending')}>
                            {CalendarTaskService.getTaskStatusConfig()[task?.status || 'pending']?.label || task?.status}
                          </span>
                          {task?.client && (
                            <span className="text-xs text-gray-500">
                              Client: {task?.client.client_name}
                            </span>
                          )}
                          {task?.due_date && (
                            <span className="text-xs text-gray-500">
                              Due: {CalendarTaskService.formatDate(task?.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        {task?.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleTaskStatusUpdate(task?.id, 'in_progress')}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => handleTaskStatusUpdate(task?.id, 'completed')}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Complete
                            </button>
                          </>
                        )}
                        {task?.status === 'in_progress' && (
                          <button
                            onClick={() => handleTaskStatusUpdate(task?.id, 'completed')}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow h-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
            </div>
            <div className="h-full">
              <Calendar 
                events={calendarEvents} 
                onDateSelect={setSelectedDate} 
                onEventClick={handleEventClick}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        )}

        {/* Deadlines Tab */}
        {activeTab === 'deadlines' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Document Deadlines</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {documentDeadlines.map((deadline) => (
                  <div key={deadline.id} className={`border rounded-lg p-4 ${
                    CalendarTaskService.isOverdue(deadline.deadline_date) ? 'border-red-200 bg-red-50' : 
                    deadline?.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{deadline.description}</h4>
                        <p className="text-gray-600 text-sm">
                          {deadline.client?.client_name} - {deadline.document_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`text-sm ${
                            CalendarTaskService.isOverdue(deadline.deadline_date) ? 'text-red-600 font-bold' : 'text-gray-600'
                          }`}>
                            {CalendarTaskService.isOverdue(deadline.deadline_date) ? '⚠️ OVERDUE: ' : 'Due: '}
                            {CalendarTaskService.formatDate(deadline.deadline_date)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            deadline?.status === 'completed' ? 'bg-green-100 text-green-800' :
                            CalendarTaskService.isOverdue(deadline.deadline_date) ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {deadline?.status === 'completed' ? '✅ Completed' :
                             CalendarTaskService.isOverdue(deadline.deadline_date) ? '⚠️ Overdue' : '⏳ Pending'}
                          </span>
                        </div>
                      </div>
                      {deadline?.status === 'pending' && (
                        <button
                          onClick={() => handleCompleteDeadline(deadline.id)}
                          className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Creation Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData(prev => ({...prev, title: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                  <select
                    value={taskFormData.taskType}
                    onChange={(e) => setTaskFormData(prev => ({...prev, taskType: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="document_renewal">Document Renewal</option>
                    <option value="filing_deadline">Filing Deadline</option>
                    <option value="appointment">Appointment</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData(prev => ({...prev, priority: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData(prev => ({...prev, dueDate: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Users</label>
                <UserSelector
                  selectedUsers={taskFormData.assignees}
                  onSelectionChange={(users) => setTaskFormData(prev => ({...prev, assignees: users}))}
                  placeholder="Select team members for this task..."
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">You can assign this task to multiple team members</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Creation Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Event</h3>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData(prev => ({...prev, title: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={eventFormData.eventType}
                  onChange={(e) => setEventFormData(prev => ({...prev, eventType: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="meeting">Meeting</option>
                  <option value="appointment">Appointment</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventFormData.startTime}
                    onChange={(e) => setEventFormData(prev => ({...prev, startTime: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventFormData.endTime}
                    onChange={(e) => setEventFormData(prev => ({...prev, endTime: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData(prev => ({...prev, location: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Meeting room, address, or online link"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Attendees</label>
                <UserSelector
                  selectedUsers={eventFormData.attendees}
                  onSelectionChange={(users) => setEventFormData(prev => ({...prev, attendees: users}))}
                  placeholder="Select attendees for this event..."
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Invite team members to attend this event</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onEdit={handleTaskEdit}
        onDelete={handleTaskDelete}
        onStatusChange={handleTaskStatusChange}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onEdit={handleEventEdit}
        onDelete={handleEventDelete}
      />
    </div>
  );
};

export default CalendarTaskManagement;