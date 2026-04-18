// ============================================================
// Email Service - Frontend client for /api/email-api
// ============================================================

const API_BASE = '/api';

class EmailService {
  constructor() {
    this.userId = null;
  }

  setUserId(id) {
    this.userId = id;
  }

  // ── Helper ────────────────────────────────────────────────
  async _post(action, params = {}) {
    const res = await fetch(`${API_BASE}/email-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, user_id: this.userId, ...params }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Email API error: ${res.status}`);
    }
    return data;
  }

  async _get(path) {
    const res = await fetch(`${API_BASE}/${path}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Email API error: ${res.status}`);
    }
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────
  getLoginUrl() {
    return `${API_BASE}/email-auth?action=login&user_id=${this.userId}`;
  }

  async getStatus() {
    return this._get(`email-auth?action=status&user_id=${this.userId}`);
  }

  async disconnect() {
    const res = await fetch(`${API_BASE}/email-auth?action=disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: this.userId }),
    });
    return res.json();
  }

  // ── Inbox ─────────────────────────────────────────────────
  async getInbox({ folder = 'inbox', page = 1, pageSize = 25, filter } = {}) {
    return this._post('inbox', { folder, page, pageSize, filter });
  }

  // ── Message ───────────────────────────────────────────────
  async getMessage(messageId) {
    return this._post('message', { messageId });
  }

  // ── Send ──────────────────────────────────────────────────
  async send({ to, cc, bcc, subject, body, contentType = 'HTML' }) {
    return this._post('send', { to, cc, bcc, subject, body, contentType });
  }

  // ── Reply ─────────────────────────────────────────────────
  async reply(messageId, body, replyAll = false) {
    return this._post('reply', { messageId, body, replyAll });
  }

  // ── Forward ───────────────────────────────────────────────
  async forward(messageId, to, comment = '') {
    return this._post('forward', { messageId, to, comment });
  }

  // ── Move ──────────────────────────────────────────────────
  async move(messageId, destinationFolder) {
    return this._post('move', { messageId, destinationFolder });
  }

  // ── Delete ────────────────────────────────────────────────
  async deleteMessage(messageId) {
    return this._post('delete', { messageId });
  }

  // ── Search ────────────────────────────────────────────────
  async search(query, pageSize = 25) {
    return this._post('search', { query, pageSize });
  }

  // ── Folders ───────────────────────────────────────────────
  async getFolders() {
    return this._post('folders');
  }

  // ── Mark Read/Unread ──────────────────────────────────────
  async markRead(messageId, isRead = true) {
    return this._post('mark-read', { messageId, isRead });
  }

  // ── Job Linking ───────────────────────────────────────────
  async linkToJob(messageId, jobId, notes = '') {
    return this._post('link-job', { messageId, jobId, notes });
  }

  async unlinkFromJob(messageId, jobId) {
    return this._post('unlink-job', { messageId, jobId });
  }

  async getJobEmails(jobId) {
    return this._post('job-emails', { jobId });
  }
}

const emailService = new EmailService();
export default emailService;
