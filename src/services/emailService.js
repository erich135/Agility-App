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

  // ── Auth / Status ─────────────────────────────────────────
  async getStatus() {
    return this._get(`email-api?action=status`);
  }

  // ── Inbox ─────────────────────────────────────────────────
  async getInbox({ folder = 'INBOX', page = 1, pageSize = 25 } = {}) {
    return this._post('inbox', { folder, page, pageSize });
  }

  // ── Message ───────────────────────────────────────────────
  async getMessage(messageId, folder = 'INBOX') {
    return this._post('message', { messageId, folder });
  }

  // ── Send ──────────────────────────────────────────────────
  async send({ to, cc, bcc, subject, body, contentType = 'HTML' }) {
    return this._post('send', { to, cc, bcc, subject, body, contentType });
  }

  // ── Reply ─────────────────────────────────────────────────
  async reply(messageId, body, replyAll = false, folder = 'INBOX') {
    return this._post('reply', { messageId, body, replyAll, folder });
  }

  // ── Forward ───────────────────────────────────────────────
  async forward(messageId, to, comment = '', folder = 'INBOX') {
    return this._post('forward', { messageId, to, comment, folder });
  }

  // ── Move ──────────────────────────────────────────────────
  async move(messageId, destinationFolder, folder = 'INBOX') {
    return this._post('move', { messageId, destinationFolder, folder });
  }

  // ── Delete ────────────────────────────────────────────────
  async deleteMessage(messageId, folder = 'INBOX') {
    return this._post('delete', { messageId, folder });
  }

  // ── Attachment Download ───────────────────────────────────
  getAttachmentUrl(messageId, attachmentIndex, folder = 'INBOX') {
    return `${API_BASE}/email-api?attachment=1&uid=${encodeURIComponent(messageId)}&index=${encodeURIComponent(attachmentIndex)}&folder=${encodeURIComponent(folder)}`;
  }

  // ── Search ────────────────────────────────────────────────
  async search(query, folder = 'INBOX', pageSize = 25) {
    return this._post('search', { query, folder, pageSize });
  }

  // ── Folders ───────────────────────────────────────────────
  async getFolders() {
    return this._post('folders');
  }

  // ── Mark Read/Unread ──────────────────────────────────────
  async markRead(messageId, isRead = true, folder = 'INBOX') {
    return this._post('mark-read', { messageId, isRead, folder });
  }

  // ── Job Linking ───────────────────────────────────────────
  async linkToJob(messageId, jobId, folder = 'INBOX', notes = '') {
    return this._post('link-job', { messageId, jobId, folder, notes });
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
