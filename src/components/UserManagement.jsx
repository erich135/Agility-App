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
  const [selectedTemplate, setSelectedTemplate] = useState('');
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
      // Load permissions catalog (if table exists)
      try {
        const { data: permsData } = await supabase
          .from('permissions')
          .select('key,name,description,category')
          .order('category')
          .order('name');
        setPermissions(permsData || []);
      } catch (e) {
        console.warn('Permissions table not found; using empty list', e);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();

    let createdUserId = null;
    try {
      // Generate invitation token
      const token = crypto.randomUUID();

      // Create user record
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          ...inviteForm,
          full_name: `${inviteForm.first_name} ${inviteForm.last_name}`,
          phone: '',
          invitation_token: token,
          invitation_sent_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      createdUserId = newUser?.id;

      // If role is consultant, create consultant record
      if (inviteForm.role === 'consultant') {
        const { error: consultantError } = await supabase
          .from('consultants')
          .insert({
            user_id: newUser.id,
            full_name: `${inviteForm.first_name} ${inviteForm.last_name}`,
            email: inviteForm.email,
            phone: '',
            designation: 'Consultant',
            hourly_rate: 850.00,
            default_hourly_rate: 850.00,
            is_active: true,
            can_approve_timesheets: false,
            role: 'consultant'
          });

        if (consultantError) {
          console.error('Failed to create consultant record:', consultantError);
          throw new Error('Failed to create consultant profile: ' + consultantError.message);
        }
      }

      // Auto-grant template permissions based on selected role
      await applyRoleTemplate(newUser.id, inviteForm.role);

      // Send invitation email via API
      const inviteLink = `${window.location.origin}/setup-password?token=${token}`;
      
      const emailResp = await fetch('/api/send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          name: `${inviteForm.first_name} ${inviteForm.last_name}`,
          inviteLink
        })
      });

      if (!emailResp.ok) {
        let details = '';
        try {
          const json = await emailResp.json();
          details = json?.details || json?.error || '';
        } catch {
          try {
            details = await emailResp.text();
          } catch {
            details = '';
          }
        }

        throw new Error(details || `Invitation email failed (HTTP ${emailResp.status})`);
      }

      alert('Invitation sent successfully!');
      setShowInviteForm(false);
      setInviteForm({ first_name: '', last_name: '', email: '', role: 'user' });
      loadData();
    } catch (error) {
      console.error('Error inviting user:', error);

      // Roll back DB insert if we created the user but failed to email.
      if (createdUserId) {
        try {
          await supabase.from('consultants').delete().eq('user_id', createdUserId);
        } catch {}
        try {
          await supabase.from('user_permissions').delete().eq('user_id', createdUserId);
        } catch {}
        try {
          await supabase.from('users').delete().eq('id', createdUserId);
        } catch {}
      }

      alert('Failed to invite user: ' + error.message);
    }
  };

  const handleResendInvite = async (user) => {
    if (!user?.email) return;
    if (user.password_hash) {
      alert('This user is already active.');
      return;
    }
    if (!user.invitation_token) {
      alert('No invitation token found for this user.');
      return;
    }

    try {
      const inviteLink = `${window.location.origin}/setup-password?token=${user.invitation_token}`;

      const resp = await fetch('/api/send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          inviteLink
        })
      });

      if (!resp.ok) {
        let details = '';
        try {
          const json = await resp.json();
          details = json?.details || json?.error || '';
        } catch {
          try {
            details = await resp.text();
          } catch {
            details = '';
          }
        }

        throw new Error(details || `Resend failed (HTTP ${resp.status})`);
      }

      await supabase
        .from('users')
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq('id', user.id);

      alert('Invitation resent successfully!');
      loadData();
    } catch (e) {
      console.error('Resend invite error:', e);
      alert('Failed to resend invitation: ' + (e?.message || 'Unknown error'));
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
    setSelectedTemplate('');
    
    // Load user's current granular permissions (if table exists)
    try {
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', user.id);
      user.permissions = (userPerms || []).map(p => p.permission_key);
    } catch (e) {
      console.warn('user_permissions table not found; defaulting to empty', e);
      user.permissions = [];
    }
    
    setShowPermissions(true);
  };

  const handleTogglePermission = async (permissionKey, currentlyEnabled) => {
    try {
      if (currentlyEnabled) {
        // Remove permission
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('permission_key', permissionKey);
        setSelectedUser(prev => ({
          ...prev,
          permissions: (prev.permissions || []).filter(k => k !== permissionKey)
        }));
      } else {
        // Add permission
        await supabase
          .from('user_permissions')
          .insert({ user_id: selectedUser.id, permission_key: permissionKey });
        setSelectedUser(prev => ({
          ...prev,
          permissions: [ ...(prev.permissions || []), permissionKey ]
        }));
      }
    } catch (e) {
      console.error('Failed to toggle permission', e);
      alert('Failed to update permission.');
    }
  };

  // Role templates mapping
  const ROLE_TEMPLATES = {
    admin: () => permissions.map(p => p.key),
    consultant: () => [
      'access_dashboard',
      'access_customers',
      'customers_view_my',
      'log_time',
      'access_documents',
      'documents_view',
      'access_calendar'
    ],
    accounts: () => [
      'access_dashboard',
      'access_billing_dashboard',
      'access_billing_reports',
      'access_financial_statements',
      'access_documents',
      'documents_view'
    ],
    user: () => [
      'access_dashboard',
      'access_calendar',
      'access_documents',
      'documents_view'
    ]
  };

  const applyPermissions = async (userId, keys) => {
    if (!keys || keys.length === 0) return;
    const rows = keys.map(k => ({ user_id: userId, permission_key: k }));
    await supabase.from('user_permissions').upsert(rows, { onConflict: 'user_id,permission_key' });
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser(prev => ({ ...prev, permissions: Array.from(new Set([...(prev.permissions || []), ...keys])) }));
    }
  };

  const clearAllPermissions = async (userId) => {
    await supabase.from('user_permissions').delete().eq('user_id', userId);
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser(prev => ({ ...prev, permissions: [] }));
    }
  };

  const selectAllPermissions = async (userId) => {
    const allKeys = permissions.map(p => p.key);
    await applyPermissions(userId, allKeys);
  };

  const applyRoleTemplate = async (userId, role) => {
    const getKeys = ROLE_TEMPLATES[role];
    const keys = getKeys ? getKeys() : [];
    if (keys.length > 0) {
      await applyPermissions(userId, keys);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
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

            {/* Template & bulk controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select role template…</option>
                <option value="admin">Admin</option>
                <option value="consultant">Consultant</option>
                <option value="accounts">Accounts</option>
                <option value="user">User</option>
              </select>
              <button
                onClick={() => selectedTemplate && applyRoleTemplate(selectedUser.id, selectedTemplate)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Template
              </button>
              <button
                onClick={() => selectAllPermissions(selectedUser.id)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Select All
              </button>
              <button
                onClick={() => clearAllPermissions(selectedUser.id)}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Clear All
              </button>
            </div>

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
                      {!user.password_hash && (
                        <button
                          onClick={() => handleResendInvite(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Resend Invitation"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
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
  );
}
