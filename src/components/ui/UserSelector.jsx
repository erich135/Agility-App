import React, { useState, useEffect } from 'react';
import { User, X, Search, UserPlus } from 'lucide-react';
import CalendarTaskService from '../../lib/CalendarTaskService';

/**
 * UserSelector Component
 * Multi-select component for choosing users for tasks and events
 */
const UserSelector = ({ 
  selectedUsers = [], 
  onSelectionChange, 
  maxSelections = null,
  placeholder = "Select users...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const users = await CalendarTaskService.getAllUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user => 
    !selectedUsers.find(selected => selected.id === user.id) &&
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.department?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUserSelect = (user) => {
    if (maxSelections && selectedUsers.length >= maxSelections) {
      return;
    }
    
    const newSelection = [...selectedUsers, user];
    onSelectionChange(newSelection);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleUserRemove = (userId) => {
    const newSelection = selectedUsers.filter(user => user.id !== userId);
    onSelectionChange(newSelection);
  };

  const getUserInitials = (fullName) => {
    return fullName
      ?.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase() || '?';
  };

  const getAvatarColor = (userId) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mr-2 ${getAvatarColor(user.id)}`}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-6 h-6 rounded-full" />
                ) : (
                  getUserInitials(user.full_name)
                )}
              </div>
              <span className="text-gray-700">{user.full_name}</span>
              <button
                onClick={() => handleUserRemove(user.id)}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* User Selection Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-left bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
            maxSelections && selectedUsers.length >= maxSelections 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
          disabled={maxSelections && selectedUsers.length >= maxSelections}
        >
          <div className="flex items-center">
            <UserPlus size={16} className="text-gray-400 mr-2" />
            <span className="text-gray-500">
              {maxSelections && selectedUsers.length >= maxSelections
                ? `Maximum ${maxSelections} users selected`
                : placeholder
              }
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No users found' : 'No available users'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserSelect(user)}
                    className="w-full flex items-center px-3 py-2 hover:bg-gray-50 text-left"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-3 ${getAvatarColor(user.id)}`}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full" />
                      ) : (
                        getUserInitials(user.full_name)
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500">
                        {user.department} • {user.email}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default UserSelector;