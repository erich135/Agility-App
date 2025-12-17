import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, Trash2, Key, CheckCircle, XCircle } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'user'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!usersError) setUsers(usersData || []);

      // Load all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true });

      if (!permsError) setPermissions(permsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    try {
      // Generate invitation token
      const token = crypto.randomUUID();

      // Create user record
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          ...inviteForm,
          invitation_token: token,
          invitation_sent_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Grant default permissions based on role
      await supabase.rpc('grant_default_permissions_by_role', {
        user_id: newUser.id,
        user_role: inviteForm.role
      });

      // Send invitation email via API
      const inviteLink = `${window.location.origin}/setup-password?token=${token}`;
      
      await fetch('/api/send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          name: `${inviteForm.first_name} ${inviteForm.last_name}`,
          inviteLink
        })
      });

      alert('Invitation sent successfully!');
      setShowInviteForm(false);
      setInviteForm({ first_name: '', last_name: '', email: '', role: 'user' });
      loadData();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to invite user: ' + error.message);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (!error) {
      loadData();
    } else {
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (!error) {
      loadData();
    } else {
      alert('Failed to delete user');
    }
  };

  const handleShowPermissions = async (user) => {
    setSelectedUser(user);
    
    // Load user's current permissions
    const { data, error } = await supabase
      .from('user_permissions')
      .select('permission_key')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (!error) {
      user.permissions = (data || []).map(p => p.permission_key);
    }
    
    setShowPermissions(true);
  };

  const handleTogglePermission = async (permissionKey, currentlyEnabled) => {
    if (!selectedUser) return;

    try {
      if (currentlyEnabled) {
        // Disable permission
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('permission_key', permissionKey);
      } else {
        // Enable permission
        await supabase
          .from('user_permissions')
          .insert({
            user_id: selectedUser.id,
            permission_key: permissionKey,
            enabled: true
          });
      }

      // Reload user permissions
      const { data } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', selectedUser.id)
        .eq('enabled', true);

      selectedUser.permissions = (data || []).map(p => p.permission_key);
      setSelectedUser({...selectedUser});
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    consultant: 'bg-blue-100 text-blue-800',
    accounts: 'bg-green-100 text-green-800',
    user: 'bg-gray-100 text-gray-800'
  };

  const permissionCategories = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Invite users and manage permissions</p>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </div>

        {/* Invite Form Modal */}
        {showInviteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Invite New User</h2>

              <form onSubmit={handleInviteUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={inviteForm.first_name}
                      onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={inviteForm.last_name}
                      onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="user">User</option>
                      <option value="consultant">Consultant</option>
                      <option value="accounts">Accounts</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermissions && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
              <h2 className="text-2xl font-bold mb-4">
                Manage Permissions: {selectedUser.first_name} {selectedUser.last_name}
              </h2>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {Object.entries(permissionCategories).map(([category, perms]) => (
                  <div key={category} className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 capitalize">{category}</h3>
                    <div className="space-y-2">
                      {perms.map(perm => {
                        const isEnabled = selectedUser.permissions?.includes(perm.key);
                        return (
                          <div key={perm.key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                              <p className="font-medium text-gray-900">{perm.name}</p>
                              <p className="text-sm text-gray-600">{perm.description}</p>
                            </div>
                            <button
                              onClick={() => handleTogglePermission(perm.key, isEnabled)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                isEnabled
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {isEnabled ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPermissions(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No users yet. Invite your first user!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.password_hash ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.last_login_at 
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => handleShowPermissions(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Manage Permissions"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          className={user.is_active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
