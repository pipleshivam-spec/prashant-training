import { Linking } from 'react-native';

export const NOTIFICATION_TYPES = {
  SESSION: 'session',
  FEES:    'fees',
  LATE:    'late',
  GENERIC: 'generic',
};

export const buildWhatsAppMessage = (student, session, type) => {
  const name = student?.name || 'Student';
  const phone = student?.phone || '';

  switch (type) {
    case NOTIFICATION_TYPES.SESSION:
      if (session) {
        return `Namaste ${name}! 🙏\n\nYour driving session is scheduled on *${session.session_date}* at *${session.session_time}*.\n\nPlease be on time. 🚗\n\n- Prashant Sir\nPrashant Motor Training, Vadodara`;
      }
      return `Namaste ${name}! 🙏\n\nThis is a reminder for your upcoming driving session.\n\nPlease contact us to confirm your slot.\n\n- Prashant Sir`;

    case NOTIFICATION_TYPES.FEES:
      return `Namaste ${name}! 🙏\n\nThis is a gentle reminder that your training fees are due.\n\nKindly clear the dues at your earliest convenience.\n\nThank you 🙏\n- Prashant Sir\nPrashant Motor Training, Vadodara`;

    case NOTIFICATION_TYPES.LATE:
      return `Namaste ${name}! 🙏\n\nWe noticed you were late for today's session. Please try to be on time for future sessions.\n\nThank you for your understanding.\n\n- Prashant Sir`;

    case NOTIFICATION_TYPES.GENERIC:
    default:
      return `Namaste ${name}! 🙏\n\nThis is a message from Prashant Motor Training.\n\nPlease contact us if you have any questions.\n\n- Prashant Sir\n📞 6879627571`;
  }
};

export const openWhatsApp = async (phone, message) => {
  try {
    const cleaned = phone?.replace(/\D/g, '');
    const number = cleaned?.startsWith('91') ? cleaned : `91${cleaned}`;
    const encoded = encodeURIComponent(message);
    const url = `whatsapp://send?phone=${number}&text=${encoded}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return { success: true };
    }
    // Fallback to web WhatsApp
    const webUrl = `https://wa.me/${number}?text=${encoded}`;
    await Linking.openURL(webUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const formatNotificationTime = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1)   return 'Just now';
    if (diffMins < 60)  return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};
