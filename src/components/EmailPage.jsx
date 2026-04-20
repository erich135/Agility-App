import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import emailService from '../services/emailService';
import supabase from '../lib/SupabaseClient';
import {
  Mail, Inbox, Send, Search, RefreshCw, Trash2, Archive,
  Star, Reply, ReplyAll, Forward, Paperclip, ChevronLeft,
  ChevronRight, Plus, Link2, Unlink, Briefcase, ExternalLink,
  FolderOpen, MoreVertical, X, Check, AlertCircle, Clock,
  ChevronDown, Eye, EyeOff, Settings, Loader2
} from 'lucide-react';

// ============================================================
// EmailPage - Full email client with job integration
// ============================================================
export default function EmailPage() {
  const { user } = useAuth();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Email state
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageDetail, setMessageDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [page, setPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 25;

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState('new'); // new, reply, replyAll, forward
  const [composeData, setComposeData] = useState({ to: '', cc: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState(null);

  // Job linking
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [linkingJob, setLinkingJob] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Init ────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      emailService.setUserId(user.id);
      checkConnection();
    }
  }, [user?.id]);



  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      const status = await emailService.getStatus();
      setIsConnected(status.connected);
      setConnectionInfo(status);
      if (status.connected) {
        loadFolders();
        loadInbox('INBOX', 1);
      }
    } catch (err) {
      console.error('Connection check failed:', err);
    }
    setCheckingConnection(false);
  };

  // ── Folders ─────────────────────────────────────────────
  const loadFolders = async () => {
    try {
      const data = await emailService.getFolders();
      setFolders(data.folders || []);
    } catch (err) {
      console.error('Load folders error:', err);
    }
  };

  // ── Inbox ───────────────────────────────────────────────
  const loadInbox = async (folder = currentFolder, p = page) => {
    setLoading(true);
    setSearchResults(null);
    try {
      const data = await emailService.getInbox({ folder, page: p, pageSize });
      setMessages(data.messages || []);
      setTotalMessages(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleFolderChange = (folderId) => {
    setCurrentFolder(folderId);
    setPage(1);
    setSelectedMessage(null);
    setMessageDetail(null);
    loadInbox(folderId, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadInbox(currentFolder, newPage);
  };

  // ── Message Detail ──────────────────────────────────────
  const openMessage = async (msg) => {
    setSelectedMessage(msg);
    setLoadingMessage(true);
    try {
      const data = await emailService.getMessage(msg.id, currentFolder);
      setMessageDetail(data);

      // Mark as read if unread
      if (!msg.isRead) {
        await emailService.markRead(msg.id, true, currentFolder);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      }
    } catch (err) {
      showToast('Failed to load message', 'error');
    }
    setLoadingMessage(false);
  };

  // ── Search ──────────────────────────────────────────────
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const data = await emailService.search(searchQuery.trim(), currentFolder);
      setSearchResults(data.messages || []);
    } catch (err) {
      showToast('Search failed', 'error');
    }
    setIsSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // ── Compose / Reply / Forward ───────────────────────────
  const openCompose = (mode = 'new', msg = null) => {
    setComposeMode(mode);
    setReplyToMessageId(msg?.id || null);

    if (mode === 'new') {
      setComposeData({ to: '', cc: '', subject: '', body: '' });
    } else if (mode === 'reply' || mode === 'replyAll') {
      const from = msg?.from?.emailAddress?.address || '';
      const ccAddrs = mode === 'replyAll'
        ? (msg?.toRecipients || []).map(r => r.emailAddress.address).filter(e => e !== connectionInfo?.email).join(', ')
        : '';
      setComposeData({
        to: from,
        cc: ccAddrs,
        subject: `Re: ${msg?.subject || ''}`,
        body: '',
      });
    } else if (mode === 'forward') {
      setComposeData({
        to: '',
        cc: '',
        subject: `Fwd: ${msg?.subject || ''}`,
        body: '',
      });
    }
    setShowCompose(true);
  };

  const handleSend = async () => {
    if (!composeData.to.trim()) {
      showToast('Please enter a recipient', 'error');
      return;
    }
    setSending(true);
    try {
      if (composeMode === 'new') {
        await emailService.send({
          to: composeData.to.split(',').map(e => e.trim()),
          cc: composeData.cc ? composeData.cc.split(',').map(e => e.trim()) : undefined,
          subject: composeData.subject,
          body: composeData.body,
        });
      } else if (composeMode === 'reply' || composeMode === 'replyAll') {
        await emailService.reply(replyToMessageId, composeData.body, composeMode === 'replyAll', currentFolder);
      } else if (composeMode === 'forward') {
        await emailService.forward(
          replyToMessageId,
          composeData.to.split(',').map(e => e.trim()),
          composeData.body,
          currentFolder
        );
      }
      showToast('Email sent!');
      setShowCompose(false);
      loadInbox();
    } catch (err) {
      showToast('Failed to send email', 'error');
    }
    setSending(false);
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async (messageId) => {
    try {
      await emailService.deleteMessage(messageId, currentFolder);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
        setMessageDetail(null);
      }
      showToast('Email deleted');
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  // ── Job Linking ─────────────────────────────────────────
  const loadJobsAndClients = async () => {
    const [jobResult, clientResult] = await Promise.all([
      supabase.from('job_register').select('id, title, client_id, category, status').order('created_at', { ascending: false }).limit(200),
      supabase.from('clients').select('id, name, email'),
    ]);
    setJobs(jobResult.data || []);
    setClients(clientResult.data || []);
  };

  const openJobPicker = () => {
    loadJobsAndClients();
    setShowJobPicker(true);
    setJobSearchQuery('');
  };

  const handleLinkJob = async (jobId) => {
    if (!selectedMessage) return;
    setLinkingJob(true);
    try {
      await emailService.linkToJob(selectedMessage.id, jobId, currentFolder);
      showToast('Email linked to job!');
      setShowJobPicker(false);
      // Refresh message detail to show updated links
      const data = await emailService.getMessage(selectedMessage.id, currentFolder);
      setMessageDetail(data);
    } catch (err) {
      showToast('Failed to link email', 'error');
    }
    setLinkingJob(false);
  };

  const handleUnlinkJob = async (jobId) => {
    if (!selectedMessage) return;
    try {
      await emailService.unlinkFromJob(selectedMessage.id, jobId);
      showToast('Email unlinked from job');
      const data = await emailService.getMessage(selectedMessage.id, currentFolder);
      setMessageDetail(data);
    } catch (err) {
      showToast('Failed to unlink', 'error');
    }
  };

  // ── Create Job from Email ───────────────────────────────
  const openCreateJobFromEmail = () => {
    loadJobsAndClients();
    setShowCreateJob(true);
  };

  // ── Helpers ─────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getSenderName = (msg) => {
    return msg?.from?.emailAddress?.name || msg?.from?.emailAddress?.address || 'Unknown';
  };

  const getSenderEmail = (msg) => {
    return msg?.from?.emailAddress?.address || '';
  };

  // Build folder tree structure for nested display
  const buildFolderTree = (flatFolders) => {
    const tree = [];
    const map = {};
    flatFolders.forEach(f => { map[f.path] = { ...f, children: [] }; });
    flatFolders.forEach(f => {
      if (f.parentPath && map[f.parentPath]) {
        map[f.parentPath].children.push(map[f.path]);
      } else {
        tree.push(map[f.path]);
      }
    });
    return tree;
  };
  const folderTree = buildFolderTree(folders);
  const currentFolderName = folders.find(f => f.id === currentFolder)?.displayName || currentFolder;
  const displayMessages = searchResults || messages;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  // ── Not Connected ───────────────────────────────────────
  if (checkingConnection) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Email Not Configured</h2>
          <p className="text-gray-500 mb-6">
            Email requires server-side IMAP/SMTP configuration. Please set the EMAIL_HOST,
            EMAIL_USER, and EMAIL_PASSWORD environment variables in Vercel.
          </p>
        </div>
      </div>
    );
  }

  // ── Connected - Main Layout ─────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* ── Left: Folder Sidebar ────────────────────────── */}
      <div className="w-52 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-3">
          <button
            onClick={() => openCompose('new')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {folderTree.map(folder => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              currentFolder={currentFolder}
              onSelect={handleFolderChange}
              depth={0}
            />
          ))}
        </div>

        {/* Connection info */}
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 truncate" title={connectionInfo?.email}>
            {connectionInfo?.email}
          </p>
        </div>
      </div>

      {/* ── Middle: Message List ────────────────────────── */}
      <div className={`${selectedMessage ? 'w-96' : 'flex-1'} border-r border-gray-200 flex flex-col`}>

        {/* Search + Toolbar */}
        <div className="p-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800 flex-1">{currentFolderName}</h2>
            <button onClick={() => { setPage(1); loadInbox(currentFolder, 1); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
          {searchResults && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{searchResults.length} results</span>
              <button onClick={clearSearch} className="text-blue-600 hover:text-blue-700">Clear search</button>
            </div>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Inbox className="w-8 h-8 mb-2" />
              <p className="text-sm">{searchResults ? 'No results found' : 'No messages'}</p>
            </div>
          ) : (
            displayMessages.map(msg => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                  selectedMessage?.id === msg.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                } ${!msg.isRead ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm truncate max-w-[200px] ${!msg.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {getSenderName(msg)}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatDate(msg.receivedDateTime)}</span>
                </div>
                <p className={`text-sm truncate ${!msg.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {msg.subject || '(no subject)'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{msg.bodyPreview}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {msg.hasAttachments && <Paperclip className="w-3 h-3 text-gray-400" />}
                  {msg.importance === 'high' && <AlertCircle className="w-3 h-3 text-red-500" />}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {!searchResults && totalMessages > pageSize && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-500">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalMessages)} of {totalMessages}
            </span>
            <div className="flex gap-1">
              <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => handlePageChange(page + 1)} disabled={!hasMore} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Message Detail ───────────────────────── */}
      {selectedMessage && (
        <div className="flex-1 flex flex-col min-w-0">
          {loadingMessage ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : messageDetail ? (
            <>
              {/* Message Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-4">
                    {messageDetail.message.subject || '(no subject)'}
                  </h3>
                  <button onClick={() => { setSelectedMessage(null); setMessageDetail(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{messageDetail.message.from?.emailAddress?.name}</p>
                    <p className="text-xs text-gray-500">{messageDetail.message.from?.emailAddress?.address}</p>
                    {messageDetail.message.toRecipients?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        To: {messageDetail.message.toRecipients.map(r => r.emailAddress.name || r.emailAddress.address).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(messageDetail.message.receivedDateTime)}</span>
                </div>

                {/* Attachments */}
                {messageDetail.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {messageDetail.attachments.filter(a => !a.isInline).map(att => (
                      <span key={att.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                        <Paperclip className="w-3 h-3" />
                        {att.name}
                        <span className="text-gray-400">({(att.size / 1024).toFixed(0)}KB)</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Linked Jobs */}
                {messageDetail.linkedJobs?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {messageDetail.linkedJobs.map(link => (
                      <LinkedJobBadge
                        key={link.job_id}
                        jobId={link.job_id}
                        onUnlink={() => handleUnlinkJob(link.job_id)}
                      />
                    ))}
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openCompose('reply', messageDetail.message)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Reply className="w-4 h-4" /> Reply
                  </button>
                  <button onClick={() => openCompose('replyAll', messageDetail.message)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    <ReplyAll className="w-4 h-4" /> Reply All
                  </button>
                  <button onClick={() => openCompose('forward', messageDetail.message)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Forward className="w-4 h-4" /> Forward
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <button onClick={openJobPicker} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Link2 className="w-4 h-4" /> Link to Job
                  </button>
                  <button onClick={openCreateJobFromEmail} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg">
                    <Briefcase className="w-4 h-4" /> Create Job
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => handleDelete(selectedMessage.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div className="flex-1 overflow-y-auto p-4">
                {messageDetail.message.body?.contentType === 'html' ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(messageDetail.message.body.content) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {messageDetail.message.body?.content}
                  </pre>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Compose Modal ──────────────────────────────── */}
      {showCompose && (
        <ComposeModal
          mode={composeMode}
          data={composeData}
          onChange={setComposeData}
          onSend={handleSend}
          onClose={() => setShowCompose(false)}
          sending={sending}
        />
      )}

      {/* ── Job Picker Modal ──────────────────────────── */}
      {showJobPicker && (
        <JobPickerModal
          jobs={jobs}
          clients={clients}
          searchQuery={jobSearchQuery}
          onSearchChange={setJobSearchQuery}
          onSelect={handleLinkJob}
          onClose={() => setShowJobPicker(false)}
          linking={linkingJob}
        />
      )}

      {/* ── Create Job from Email Modal ───────────────── */}
      {showCreateJob && messageDetail && (
        <CreateJobFromEmailModal
          message={messageDetail.message}
          clients={clients}
          onCreated={(jobId) => {
            setShowCreateJob(false);
            handleLinkJob(jobId);
          }}
          onClose={() => setShowCreateJob(false)}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-green-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Compose Modal
// ============================================================
function ComposeModal({ mode, data, onChange, onSend, onClose, sending }) {
  const titles = { new: 'New Email', reply: 'Reply', replyAll: 'Reply All', forward: 'Forward' };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">{titles[mode]}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="text"
              value={data.to}
              onChange={(e) => onChange({ ...data, to: e.target.value })}
              placeholder="recipient@email.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(mode === 'new' || mode === 'replyAll') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CC</label>
              <input
                type="text"
                value={data.cc}
                onChange={(e) => onChange({ ...data, cc: e.target.value })}
                placeholder="cc@email.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <input
              type="text"
              value={data.subject}
              onChange={(e) => onChange({ ...data, subject: e.target.value })}
              placeholder="Subject"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <textarea
              value={data.body}
              onChange={(e) => onChange({ ...data, body: e.target.value })}
              placeholder="Write your message..."
              rows={10}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Job Picker Modal
// ============================================================
function JobPickerModal({ jobs, clients, searchQuery, onSearchChange, onSelect, onClose, linking }) {
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.name; });

  const filteredJobs = jobs.filter(j => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const clientName = clientMap[j.client_id] || '';
    return j.title.toLowerCase().includes(q) || clientName.toLowerCase().includes(q) || (j.category || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Link to Job</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs or clients..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredJobs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No jobs found</p>
          ) : (
            filteredJobs.map(job => (
              <button
                key={job.id}
                onClick={() => onSelect(job.id)}
                disabled={linking}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors mb-0.5"
              >
                <p className="text-sm font-medium text-gray-800 truncate">{job.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{clientMap[job.client_id] || 'Unknown client'}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{job.category}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{job.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Create Job from Email Modal
// ============================================================
function CreateJobFromEmailModal({ message, clients, onCreated, onClose, showToast }) {
  const { user } = useAuth();
  const senderEmail = message?.from?.emailAddress?.address || '';
  const senderName = message?.from?.emailAddress?.name || '';

  // Try to auto-match client by email
  const matchedClient = clients.find(c => c.email && c.email.toLowerCase() === senderEmail.toLowerCase());

  const [formData, setFormData] = useState({
    client_id: matchedClient?.id || '',
    title: message?.subject || '',
    description: `Created from email by ${senderName} (${senderEmail})\n\nOriginal email preview:\n${message?.body?.content ? stripHtml(message.body.content).substring(0, 500) : ''}`,
    category: 'general',
    job_type: 'general',
    priority: 'medium',
    status: 'not_started',
    date_due: '',
    assigned_to_name: user?.full_name || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.client_id) {
      showToast('Please select a customer', 'error');
      return;
    }
    if (!formData.title.trim()) {
      showToast('Please enter a job title', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: formData.client_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        job_type: formData.job_type || formData.category,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        date_due: formData.date_due || null,
        assigned_to_name: formData.assigned_to_name.trim() || null,
        created_by: user?.id,
        date_created: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('job_register')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      showToast('Job created and email linked!');
      onCreated(data.id);
    } catch (err) {
      showToast('Failed to create job: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const categories = ['general', 'cipc', 'sars', 'trusts', 'payroll', 'labour', 'accounting', 'advisory', 'bbbee', 'secretarial', 'banking', 'insurance'];

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Create Job from Email</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Sender info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-blue-700">From: </span>
            <span className="font-medium text-blue-900">{senderName}</span>
            <span className="text-blue-600 ml-1">({senderEmail})</span>
            {matchedClient && (
              <span className="ml-2 text-green-700 text-xs">✓ Matched to {matchedClient.name}</span>
            )}
          </div>

          {/* Customer */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Customer *</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Job Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, job_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
            <input
              type="date"
              value={formData.date_due}
              onChange={(e) => setFormData({ ...formData, date_due: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Create Job & Link Email
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Linked Job Badge (fetches job title by ID)
// ============================================================
function LinkedJobBadge({ jobId, onUnlink }) {
  const [job, setJob] = useState(null);

  useEffect(() => {
    supabase.from('job_register').select('title, category').eq('id', jobId).single()
      .then(({ data }) => setJob(data));
  }, [jobId]);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
      <Briefcase className="w-3 h-3" />
      {job?.title || 'Loading...'}
      <button onClick={onUnlink} className="ml-1 text-blue-400 hover:text-red-600">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ============================================================
// Folder Tree Item (recursive, collapsible)
// ============================================================
function FolderTreeItem({ folder, currentFolder, onSelect, depth }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = currentFolder === folder.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(folder.id);
          if (hasChildren) setExpanded(prev => !prev);
        }}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${
          isSelected
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren && (
            <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          )}
          {!hasChildren && <span className="w-3" />}
          <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{folder.displayName}</span>
        </div>
        {folder.unreadItemCount > 0 && (
          <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center flex-shrink-0 ml-1">
            {folder.unreadItemCount}
          </span>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              currentFolder={currentFolder}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Utilities
// ============================================================
function sanitizeHtml(html) {
  // Remove script tags and event handlers for safety
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
