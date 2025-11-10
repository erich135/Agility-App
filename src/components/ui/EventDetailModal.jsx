import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Users, Edit, Trash2, UserCheck, UserX, UserMinus } from 'lucide-react';
import CalendarTaskService from '../../lib/CalendarTaskService';

/**
 * EventDetailModal Component
 * Displays detailed information about an event with attendee management
 */
const EventDetailModal = ({ 
  event, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  const [eventDetails, setEventDetails] = useState(event || {});
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setEventDetails(event);
      loadEventDetails();
    }
  }, [isOpen, event]);

  const loadEventDetails = async () => {
    setLoading(true);
    try {
      // Validate event object
      if (!event || !event.id) {
        console.error('Invalid event object:', event);
        setLoading(false);
        return;
      }

      // Load event attendees
      const eventAttendees = await CalendarTaskService.getEventAttendees(event.id);
      setAttendees(eventAttendees);
      setEventDetails(event);
    } catch (error) {
      console.error('Error loading event details:', error);
      // Use mock attendees for development
      setAttendees([
        {
          id: '1',
          full_name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'attendee',
          response_status: 'pending'
        },
        {
          id: '2',
          full_name: 'Jane Smith',
          email: 'jane.smith@example.com',
          role: 'attendee',
          response_status: 'accepted'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendeeResponse = async (attendeeId, status) => {
    try {
      await CalendarTaskService.updateAttendeeResponse(event.id, attendeeId, status);
      setAttendees(prev => 
        prev.map(attendee => 
          attendee.id === attendeeId 
            ? { ...attendee, response_status: status, response_at: new Date().toISOString() }
            : attendee
        )
      );
    } catch (error) {
      console.error('Error updating attendee response:', error);
    }
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      meeting: 'bg-blue-100 text-blue-800',
      appointment: 'bg-green-100 text-green-800',
      deadline: 'bg-red-100 text-red-800',
      reminder: 'bg-yellow-100 text-yellow-800'
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800';
  };

  const getResponseStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      tentative: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getResponseIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <UserCheck size={14} className="text-green-600" />;
      case 'declined':
        return <UserX size={14} className="text-red-600" />;
      case 'tentative':
        return <UserMinus size={14} className="text-yellow-600" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = () => {
    if (!eventDetails?.start_time || !eventDetails?.end_time) return '';
    const start = new Date(eventDetails.start_time);
    const end = new Date(eventDetails.end_time);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    }
    return '';
  };

  const getUserInitials = (fullName) => {
    return fullName
      ?.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase() || '?';
  };

  if (!isOpen || !event) return null;

  // Ensure eventDetails has valid data
  const safeEventDetails = eventDetails || event || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
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
              <p className="text-gray-600">Loading event details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Title and Type */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-xl font-semibold text-gray-900">{safeEventDetails?.title || 'Untitled Event'}</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(safeEventDetails?.event_type)}`}>
                    {safeEventDetails?.event_type || 'event'}
                  </span>
                </div>
                {safeEventDetails?.description && (
                  <p className="text-gray-600">{safeEventDetails.description}</p>
                )}
              </div>

              {/* Event Information */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 mr-2">Date:</span>
                    <span className="text-gray-900">{formatDate(safeEventDetails?.start_time)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Clock size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 mr-2">Time:</span>
                    <span className="text-gray-900">
                      {formatTime(safeEventDetails?.start_time)} - {formatTime(safeEventDetails?.end_time)}
                      {getDuration() && (
                        <span className="text-gray-500 ml-2">({getDuration()})</span>
                      )}
                    </span>
                  </div>

                  {safeEventDetails?.location && (
                    <div className="flex items-center text-sm">
                      <MapPin size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-500 mr-2">Location:</span>
                      <span className="text-gray-900">{safeEventDetails.location}</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm">
                    <Clock size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 mr-2">Created:</span>
                    <span className="text-gray-900">{formatDateTime(safeEventDetails?.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Attendees */}
              {attendees.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Users size={16} className="mr-2" />
                    Attendees ({attendees.length})
                  </h5>
                  <div className="space-y-2">
                    {attendees.map((attendee) => (
                      <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                            {getUserInitials(attendee.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attendee.full_name}</p>
                            <p className="text-xs text-gray-500">{attendee.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getResponseStatusColor(attendee.response_status)}`}>
                            {getResponseIcon(attendee.response_status)}
                            <span className="ml-1 capitalize">{attendee.response_status}</span>
                          </span>
                          {attendee.response_status === 'pending' && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleAttendeeResponse(attendee.id, 'accepted')}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Accept"
                              >
                                <UserCheck size={14} />
                              </button>
                              <button
                                onClick={() => handleAttendeeResponse(attendee.id, 'tentative')}
                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Tentative"
                              >
                                <UserMinus size={14} />
                              </button>
                              <button
                                onClick={() => handleAttendeeResponse(attendee.id, 'declined')}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Decline"
                              >
                                <UserX size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Summary */}
              {attendees.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">Response Summary</h6>
                  <div className="flex space-x-4 text-xs">
                    <span className="text-green-600">
                      ✓ {attendees.filter(a => a.response_status === 'accepted').length} Accepted
                    </span>
                    <span className="text-yellow-600">
                      ~ {attendees.filter(a => a.response_status === 'tentative').length} Tentative
                    </span>
                    <span className="text-red-600">
                      ✗ {attendees.filter(a => a.response_status === 'declined').length} Declined
                    </span>
                    <span className="text-gray-600">
                      ? {attendees.filter(a => a.response_status === 'pending').length} Pending
                    </span>
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
              onClick={() => onEdit && onEdit(event)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit size={14} className="mr-1" />
              Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(event.id)}
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

export default EventDetailModal;