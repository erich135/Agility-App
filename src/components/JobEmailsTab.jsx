import React, { useState, useEffect } from 'react';
import { Mail, Link2, ExternalLink, Paperclip, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import emailService from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// JobEmailsTab - Shows linked emails for a job in the expanded detail
// Usage: <JobEmailsTab jobId={job.id} />
// ============================================================
export default function JobEmailsTab({ jobId }) {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    emailService.setUserId(user?.id);
    loadEmails();
  }, [jobId, user?.id]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await emailService.getJobEmails(jobId);
      setEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to load job emails:', err);
    }
    setLoading(false);
  };

  const handleUnlink = async (messageId) => {
    try {
      await emailService.unlinkFromJob(messageId, jobId);
      setEmails(prev => prev.filter(e => e.message_id !== messageId));
    } catch (err) {
      console.error('Failed to unlink email:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Mail className="w-4 h-4" /> Linked Emails
        </h4>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Mail className="w-4 h-4" /> Linked Emails ({emails.length})
        </h4>
        <a
          href="/email"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Open Email <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {emails.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-3">
          No emails linked to this job yet. Open an email and click "Link to Job" to connect correspondence.
        </p>
      ) : (
        <div className="space-y-1">
          {emails.map(email => (
            <div key={email.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
              >
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{email.subject || '(no subject)'}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{email.sender_name || email.sender_email}</span>
                    <span>·</span>
                    <span>{formatDate(email.received_at)}</span>
                    {email.has_attachments && <Paperclip className="w-3 h-3" />}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnlink(email.message_id); }}
                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                    title="Unlink email"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {expandedEmail === email.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </div>

              {expandedEmail === email.id && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">
                    From: <span className="text-gray-700">{email.sender_name}</span> &lt;{email.sender_email}&gt;
                  </p>
                  {email.snippet && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1">{email.snippet}</p>
                  )}
                  {email.notes && (
                    <p className="text-xs text-blue-600 mt-1">Note: {email.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
