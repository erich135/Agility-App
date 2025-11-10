import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Clock, Flag, FileText, Users, Edit, Trash2 } from 'lucide-react';
import CalendarTaskService from '../../lib/CalendarTaskService';

/**
 * TaskDetailModal Component
 * Displays detailed information about a task with options to edit or delete
 */
const TaskDetailModal = ({ 
  task, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onStatusChange 
}) => {
  const [taskDetails, setTaskDetails] = useState(task);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      loadTaskDetails();
    }
  }, [isOpen, task]);

  const loadTaskDetails = async () => {
    setLoading(true);
    try {
      // Validate task object
      if (!task || !task.id) {
        console.error('Invalid task object:', task);
        setLoading(false);
        return;
      }

      // Load task assignees
      const taskAssignees = await CalendarTaskService.getTaskAssignees(task.id);
      setAssignees(taskAssignees);
      setTaskDetails(task);
    } catch (error) {
      console.error('Error loading task details:', error);
      // Use mock assignees for development
      setAssignees([
        {
          id: '1',
          full_name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'assignee',
          status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await CalendarTaskService.updateTaskStatus(task.id, newStatus);
      setTaskDetails(prev => ({ ...prev, status: newStatus }));
      if (onStatusChange) {
        onStatusChange(task.id, newStatus);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getUserInitials = (fullName) => {
    return fullName
      ?.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase() || '?';
  };

  if (!isOpen || !task || !taskDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading task details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Title and Priority */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-xl font-semibold text-gray-900">{taskDetails?.title || 'Untitled Task'}</h4>
                  <div className="flex space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(taskDetails?.priority || 'medium')}`}>
                      <Flag size={12} className="mr-1" />
                      {taskDetails?.priority || 'medium'}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(taskDetails?.status || 'pending')}`}>
                      {(taskDetails?.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {taskDetails?.description && (
                  <p className="text-gray-600">{taskDetails.description}</p>
                )}
              </div>

              {/* Task Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 mr-2">Due Date:</span>
                    <span className="text-gray-900">{formatDate(taskDetails?.due_date)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <FileText size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 mr-2">Type:</span>
                    <span className="text-gray-900 capitalize">{taskDetails?.task_type?.replace('_', ' ') || 'general'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Clock size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 mr-2">Created:</span>
                    <span className="text-gray-900">{formatDate(taskDetails?.created_at)}</span>
                  </div>
                  
                  {taskDetails?.completed_at && (
                    <div className="flex items-center text-sm">
                      <Clock size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-500 mr-2">Completed:</span>
                      <span className="text-gray-900">{formatDate(taskDetails.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignees */}
              {assignees.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Users size={16} className="mr-2" />
                    Assigned to ({assignees.length})
                  </h5>
                  <div className="space-y-2">
                    {assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                            {getUserInitials(assignee.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{assignee.full_name}</p>
                            <p className="text-xs text-gray-500">{assignee.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 capitalize">{assignee.role}</p>
                          <p className="text-xs text-gray-400">{assignee.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Actions */}
              {taskDetails && taskDetails.status !== 'completed' && taskDetails.status !== 'cancelled' && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Update Status</h5>
                  <div className="flex space-x-2">
                    {taskDetails.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate('in_progress')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Start Task
                      </button>
                    )}
                    {(taskDetails.status === 'pending' || taskDetails.status === 'in_progress') && (
                      <button
                        onClick={() => handleStatusUpdate('completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit && onEdit(task)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit size={14} className="mr-1" />
              Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(task.id)}
              className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 size={14} className="mr-1" />
              Delete
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;