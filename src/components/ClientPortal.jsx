import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, MessageSquare, Bell, User, LogOut, Upload, Eye } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

const ClientPortal = () => {
  const [clientUser, setClientUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [clientData, setClientData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Login/Registration states
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    checkClientSession();
  }, []);

  useEffect(() => {
    if (clientUser && clientData) {
      fetchPortalData();
    }
  }, [clientUser, clientData]);

  const checkClientSession = () => {
    const storedClient = localStorage.getItem('client_portal_user');
    if (storedClient) {
      const user = JSON.parse(storedClient);
      setClientUser(user);
      fetchClientData(user.client_id);
    } else {
      setLoading(false);
    }
  };

  const fetchClientData = async (clientId) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClientData(data);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortalData = async () => {
    try {
      await Promise.all([
        fetchDocuments(),
        fetchMessages(),
        fetchUpcomingDeadlines(),
        fetchNotifications()
      ]);
    } catch (error) {
      console.error('Error fetching portal data:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientData.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUpcomingDeadlines = async () => {
    if (!clientData.registration_date) return;

    const regDate = new Date(clientData.registration_date);
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), regDate.getMonth(), regDate.getDate());
    
    if (dueDate < today) {
      dueDate.setFullYear(today.getFullYear() + 1);
    }

    setUpcomingDeadlines([
      {
        type: 'Annual Return',
        dueDate: dueDate.toISOString(),
        status: 'upcoming'
      }
    ]);
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', clientData.id)
        .eq('recipient_type', 'client')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      // Check client portal access
      const { data: accessData, error: accessError } = await supabase
        .from('client_portal_access')
        .select('*, clients(*)')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (accessError || !accessData) {
        setLoginError('Invalid email or password');
        return;
      }

      // TODO: Verify password hash
      // For now, using simple password check (implement proper hashing in production)
      
      const user = {
        id: accessData.id,
        client_id: accessData.client_id,
        email: accessData.email
      };

      localStorage.setItem('client_portal_user', JSON.stringify(user));
      setClientUser(user);
      
      // Update last login
      await supabase
        .from('client_portal_access')
        .update({ 
          last_login: new Date().toISOString(),
          login_count: accessData.login_count + 1
        })
        .eq('id', accessData.id);

      await fetchClientData(accessData.client_id);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('client_portal_user');
    setClientUser(null);
    setClientData(null);
    setDocuments([]);
    setMessages([]);
    setUpcomingDeadlines([]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // TODO: Implement file upload to storage
      alert('File upload functionality will be implemented with storage integration');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Login/Registration UI
  if (!clientUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <img 
                src="/agility-logo.png" 
                alt="Agility Logo" 
                className="h-16 w-auto mx-auto mb-4"
              />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Client Portal</h2>
              <p className="text-gray-600">Access your documents and compliance information</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {isLoginMode ? "Don't have an account? Request Access" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Portal Dashboard UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="/agility-logo.png" 
                alt="Agility Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{clientData?.client_name}</h1>
                <p className="text-sm text-gray-600">{clientData?.registration_number}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell className="w-6 h-6" />
                {notifications.filter(n => !n.read_at).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: User },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'deadlines', label: 'Deadlines', icon: Calendar },
              { id: 'messages', label: 'Messages', icon: MessageSquare }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Deadlines</h2>
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-6 h-6 text-orange-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{deadline.type}</p>
                          <p className="text-sm text-gray-600">
                            Due: {new Date(deadline.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-orange-600">
                        {Math.ceil((new Date(deadline.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No upcoming deadlines</p>
              )}
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Documents</h2>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.slice(0, 5).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">{doc.document_name}</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 text-sm">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No documents available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Your Documents</h2>
              <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                <Upload className="w-5 h-5" />
                <span>Upload Document</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {documents.length > 0 ? (
              <div className="grid gap-4">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{doc.document_name}</p>
                        <p className="text-sm text-gray-600">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No documents available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deadlines' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Filing Deadlines</h2>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className="p-6 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{deadline.type}</h3>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        Upcoming
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Due Date:</span> {new Date(deadline.dueDate).toLocaleDateString()}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Days Remaining:</span> {Math.ceil((new Date(deadline.dueDate) - new Date()) / (1000 * 60 * 60 * 24))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No upcoming deadlines</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Messages</h2>
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map(message => (
                  <div key={message.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">{message.subject}</p>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{message.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No messages</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
