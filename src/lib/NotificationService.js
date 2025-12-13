// Enhanced Notification Service with Multi-channel Support
import supabase from './SupabaseClient';
import EmailOTPService from '../services/EmailOTPService';

class NotificationService {
  /**
   * Send notification through multiple channels
   */
  async sendNotification(notification) {
    const {
      recipientType,
      recipientId,
      recipientContact,
      notificationType,
      subject,
      message,
      relatedEntityType,
      relatedEntityId,
      scheduledFor
    } = notification;

    try {
      // Create notification record
      const { data: notificationRecord, error } = await supabase
        .from('notifications')
        .insert({
          recipient_type: recipientType,
          recipient_id: recipientId,
          recipient_contact: recipientContact,
          notification_type: notificationType,
          subject,
          message,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          scheduled_for: scheduledFor || new Date().toISOString(),
          status: scheduledFor ? 'pending' : 'sent'
        })
        .select()
        .single();

      if (error) throw error;

      // If not scheduled, send immediately
      if (!scheduledFor) {
        await this.sendImmediately(notificationRecord);
      }

      return notificationRecord;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send notification immediately based on type
   */
  async sendImmediately(notification) {
    try {
      switch (notification.notification_type) {
        case 'sms':
          await this.sendSMS(notification);
          break;
        case 'email':
          await this.sendEmail(notification);
          break;
        case 'whatsapp':
          await this.sendWhatsApp(notification);
          break;
        case 'in_app':
          // In-app notifications are already stored in DB
          await this.markAsDelivered(notification.id);
          break;
        default:
          console.warn('Unknown notification type:', notification.notification_type);
      }
    } catch (error) {
      await this.markAsFailed(notification.id, error.message);
      throw error;
    }
  }

  /**
   * Send SMS notification (now via email)
   */
  async sendSMS(notification) {
    try {
      // Convert SMS to email notification
      const result = await EmailOTPService.sendEmail(
        notification.recipient_contact,
        notification.subject || 'SMS Notification',
        notification.message
      );

      await this.updateNotificationStatus(notification.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { provider_response: result, converted_to_email: true }
      });

      return result;
    } catch (error) {
      await this.markAsFailed(notification.id, error.message);
      throw error;
    }
  }

  /**
   * Send Email notification
   */
  async sendEmail(notification) {
    try {
      const result = await EmailOTPService.sendEmail(
        notification.recipient_contact,
        notification.subject,
        notification.message
      );

      await this.updateNotificationStatus(notification.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { provider_response: result }
      });

      return result;
    } catch (error) {
      await this.markAsFailed(notification.id, error.message);
      throw error;
    }
  }

  /**
   * Send WhatsApp notification (converted to email)
   */
  async sendWhatsApp(notification) {
    try {
      // Convert WhatsApp to email notification
      const result = await EmailOTPService.sendEmail(
        notification.recipient_contact,
        notification.subject || 'WhatsApp Message',
        `WhatsApp Message:\n\n${notification.message}`
      );

      await this.updateNotificationStatus(notification.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { provider_response: result, converted_to_email: true }
      });

      return result;
    } catch (error) {
      await this.markAsFailed(notification.id, error.message);
      throw error;
    }
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(notificationId, updates) {
    const { error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(notificationId) {
    await this.updateNotificationStatus(notificationId, {
      status: 'delivered',
      delivered_at: new Date().toISOString()
    });
  }

  /**
   * Mark notification as failed
   */
  async markAsFailed(notificationId, errorMessage) {
    await this.updateNotificationStatus(notificationId, {
      status: 'failed',
      error_message: errorMessage
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    await this.updateNotificationStatus(notificationId, {
      status: 'read',
      read_at: new Date().toISOString()
    });
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(userId, userType) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return default preferences if none exist
    return data || {
      sms_enabled: true,
      email_enabled: true,
      whatsapp_enabled: false,
      in_app_enabled: true,
      reminder_days: [60, 30, 14, 7, 1]
    };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId, userType, preferences) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        user_type: userType,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Schedule filing reminders for a client
   */
  async scheduleFilingReminders(client, dueDate) {
    try {
      const preferences = await this.getNotificationPreferences(client.id, 'client');
      
      if (!preferences || !preferences.reminder_days) {
        console.log('No reminder preferences found for client:', client.id);
        return;
      }

      const today = new Date();
      const due = new Date(dueDate);

      for (const days of preferences.reminder_days) {
        const reminderDate = new Date(due);
        reminderDate.setDate(due.getDate() - days);

        // Only schedule future reminders
        if (reminderDate > today) {
          // Get appropriate template
          const template = await this.getTemplate('filing_due', days);
          
          if (template && template.is_active) {
            const message = this.populateTemplate(template.body_template, {
              client_name: client.client_name,
              company_name: client.client_name,
              registration_number: client.registration_number,
              due_date: due.toLocaleDateString('en-ZA')
            });

            // Schedule SMS
            if (preferences.sms_enabled && client.phone_number) {
              await this.sendNotification({
                recipientType: 'client',
                recipientId: client.id,
                recipientContact: client.phone_number,
                notificationType: 'sms',
                message,
                relatedEntityType: 'client',
                relatedEntityId: client.id,
                scheduledFor: reminderDate.toISOString()
              });
            }

            // Schedule Email
            if (preferences.email_enabled && client.email) {
              await this.sendNotification({
                recipientType: 'client',
                recipientId: client.id,
                recipientContact: client.email,
                notificationType: 'email',
                subject: template.subject || 'Filing Reminder',
                message,
                relatedEntityType: 'client',
                relatedEntityId: client.id,
                scheduledFor: reminderDate.toISOString()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  /**
   * Get notification template
   */
  async getTemplate(triggerEvent, daysBefore = null) {
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true);

    if (daysBefore !== null) {
      query = query.eq('days_before', daysBefore);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  /**
   * Populate template with data
   */
  populateTemplate(template, data) {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId, userType) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('recipient_type', userType)
      .in('status', ['delivered', 'sent'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId, userType, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('recipient_type', userType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Send escalation alert to admins
   */
  async sendEscalationAlert(client, reason) {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('directors')
        .select('*')
        .eq('role', 'admin');

      if (error) throw error;

      const message = `ESCALATION ALERT: ${client.client_name} (${client.registration_number}) - ${reason}`;

      for (const admin of admins) {
        // Send in-app notification
        await this.sendNotification({
          recipientType: 'director',
          recipientId: admin.id,
          recipientContact: admin.email,
          notificationType: 'in_app',
          subject: 'Escalation Alert',
          message,
          relatedEntityType: 'client',
          relatedEntityId: client.id
        });

        // Send email if important
        if (admin.email) {
          await this.sendNotification({
            recipientType: 'director',
            recipientId: admin.id,
            recipientContact: admin.email,
            notificationType: 'email',
            subject: 'Escalation Alert - Immediate Action Required',
            message,
            relatedEntityType: 'client',
            relatedEntityId: client.id
          });
        }
      }
    } catch (error) {
      console.error('Error sending escalation alert:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications (to be run by cron job)
   */
  async processScheduledNotifications() {
    try {
      const now = new Date().toISOString();

      const { data: scheduled, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .limit(100);

      if (error) throw error;

      for (const notification of scheduled) {
        await this.sendImmediately(notification);
      }

      return scheduled.length;
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();
