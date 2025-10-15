import supabase from './SupabaseClient';

/**
 * Centralized Activity Logging Service
 * Captures user actions across the entire system
 */
class ActivityLogger {
  
  /**
   * Log a user activity
   * @param {Object} logData - Activity data
   * @param {string} logData.userId - User identifier (phone number)
   * @param {string} logData.userName - User display name
   * @param {string} logData.action - Action performed (login, logout, upload, download, etc.)
   * @param {string} logData.entityType - Type of entity affected (user, customer, document, system)
   * @param {string} logData.entityId - ID of the affected entity
   * @param {string} logData.entityName - Display name of the entity
   * @param {Object} logData.details - Additional context data
   * @param {string} logData.ipAddress - User's IP address
   * @param {string} logData.userAgent - Browser user agent
   */
  static async log({
    userId,
    userName,
    action,
    entityType,
    entityId = null,
    entityName = null,
    details = {},
    ipAddress = null,
    userAgent = null
  }) {
    try {
      // Get IP address if not provided
      if (!ipAddress) {
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          ipAddress = data.ip;
        } catch (err) {
          ipAddress = 'unknown';
        }
      }

      // Get user agent if not provided
      if (!userAgent && typeof navigator !== 'undefined') {
        userAgent = navigator.userAgent;
      }

      const logEntry = {
        user_id: userId,
        user_name: userName,
        action: action.toLowerCase(),
        entity_type: entityType.toLowerCase(),
        entity_id: entityId,
        entity_name: entityName,
        details: details,
        ip_address: ipAddress,
        user_agent: userAgent
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert([logEntry]);

      if (error) {
        console.error('Failed to log activity:', error);
        return false;
      }

      console.log(`Activity logged: ${action} on ${entityType} by ${userName || userId}`);
      return true;

    } catch (err) {
      console.error('Activity logging error:', err);
      return false;
    }
  }

  // Authentication Actions
  static async logLogin(userId, userName, successful = true, details = {}) {
    return this.log({
      userId,
      userName,
      action: successful ? 'login_success' : 'login_failed',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: { 
        successful,
        login_method: 'otp',
        ...details 
      }
    });
  }

  static async logLogout(userId, userName, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details
    });
  }

  static async logOTPGenerated(userId, userName, phone, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'otp_generated',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: {
        phone,
        ...details
      }
    });
  }

  static async logOTPVerification(userId, userName, successful, details = {}) {
    return this.log({
      userId,
      userName,
      action: successful ? 'otp_verified' : 'otp_failed',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      details: {
        successful,
        ...details
      }
    });
  }

  // Document Actions
  static async logDocumentUpload(userId, userName, documentId, documentName, documentType, clientId, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'document_upload',
      entityType: 'document',
      entityId: documentId,
      entityName: documentName,
      details: {
        document_type: documentType,
        client_id: clientId,
        file_size: details.fileSize,
        mime_type: details.mimeType,
        ...details
      }
    });
  }

  static async logDocumentView(userId, userName, documentId, documentName, clientId, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'document_view',
      entityType: 'document',
      entityId: documentId,
      entityName: documentName,
      details: {
        client_id: clientId,
        ...details
      }
    });
  }

  static async logDocumentDownload(userId, userName, documentId, documentName, clientId, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'document_download',
      entityType: 'document',
      entityId: documentId,
      entityName: documentName,
      details: {
        client_id: clientId,
        ...details
      }
    });
  }

  static async logDocumentDelete(userId, userName, documentId, documentName, clientId, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'document_delete',
      entityType: 'document',
      entityId: documentId,
      entityName: documentName,
      details: {
        client_id: clientId,
        ...details
      }
    });
  }

  // Customer Actions
  static async logCustomerAccess(userId, userName, customerId, customerName, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'customer_access',
      entityType: 'customer',
      entityId: customerId,
      entityName: customerName,
      details
    });
  }

  static async logCustomerCreate(userId, userName, customerId, customerName, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'customer_create',
      entityType: 'customer',
      entityId: customerId,
      entityName: customerName,
      details
    });
  }

  static async logCustomerUpdate(userId, userName, customerId, customerName, details = {}) {
    return this.log({
      userId,
      userName,
      action: 'customer_update',
      entityType: 'customer',
      entityId: customerId,
      entityName: customerName,
      details
    });
  }

  // System Actions
  static async logSystemAction(userId, userName, action, details = {}) {
    return this.log({
      userId: userId || 'system',
      userName: userName || 'System',
      action: `system_${action}`,
      entityType: 'system',
      entityId: null,
      entityName: 'System Administration',
      details
    });
  }

  // User Management Actions
  static async logUserCreate(adminUserId, adminUserName, newUserId, newUserName, details = {}) {
    return this.log({
      userId: adminUserId,
      userName: adminUserName,
      action: 'user_create',
      entityType: 'user',
      entityId: newUserId,
      entityName: newUserName,
      details
    });
  }

  static async logUserUpdate(adminUserId, adminUserName, targetUserId, targetUserName, details = {}) {
    return this.log({
      userId: adminUserId,
      userName: adminUserName,
      action: 'user_update',
      entityType: 'user',
      entityId: targetUserId,
      entityName: targetUserName,
      details
    });
  }

  static async logUserDelete(adminUserId, adminUserName, targetUserId, targetUserName, details = {}) {
    return this.log({
      userId: adminUserId,
      userName: adminUserName,
      action: 'user_delete',
      entityType: 'user',
      entityId: targetUserId,
      entityName: targetUserName,
      details
    });
  }

  // Fetch Activity Logs (for admin interface)
  static async getActivityLogs({
    limit = 100,
    offset = 0,
    userId = null,
    action = null,
    entityType = null,
    startDate = null,
    endDate = null
  } = {}) {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (action) {
        query = query.eq('action', action);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        logs: data || [],
        totalCount: count,
        hasMore: (data?.length || 0) === limit
      };

    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      return {
        logs: [],
        totalCount: 0,
        hasMore: false,
        error: err.message
      };
    }
  }

  // Get activity summary statistics
  static async getActivitySummary(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('activity_logs')
        .select('action, entity_type, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const summary = {
        totalActivities: data.length,
        actionSummary: {},
        entitySummary: {},
        dailyActivity: {}
      };

      data.forEach(log => {
        // Action summary
        summary.actionSummary[log.action] = (summary.actionSummary[log.action] || 0) + 1;
        
        // Entity summary
        summary.entitySummary[log.entity_type] = (summary.entitySummary[log.entity_type] || 0) + 1;
        
        // Daily activity
        const date = new Date(log.created_at).toDateString();
        summary.dailyActivity[date] = (summary.dailyActivity[date] || 0) + 1;
      });

      return summary;

    } catch (err) {
      console.error('Failed to get activity summary:', err);
      return null;
    }
  }
}

export default ActivityLogger;