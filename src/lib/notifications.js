// src/lib/notifications.js
// Push notification setup and local session reminder scheduling

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Configure how notifications look when app is in foreground ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Request notification permission ──────────────────────────────
export const requestNotificationPermission = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('session-reminders', {
        name: 'Session Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FCD400',
        sound: 'default',
      });
    }

    return true;
  } catch (err) {
    console.error('Notification permission error:', err);
    return false;
  }
};

// ── Cancel all previously scheduled session reminders ────────────
export const cancelAllSessionReminders = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error('Failed to cancel notifications:', err);
  }
};

// ── Schedule reminders for upcoming sessions ─────────────────────
// sessions: array of schedule objects with session_date, session_time, session_type
export const scheduleSessionReminders = async (sessions = []) => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    // Cancel old scheduled notifications first
    await cancelAllSessionReminders();

    const now = new Date();
    let scheduledCount = 0;

    for (const session of sessions) {
      if (session.status !== 'Scheduled') continue;

      // Parse session datetime
      const [year, month, day] = session.session_date.split('-').map(Number);
      const [hourStr, minuteStr] = (session.session_time || '10:00').split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      const sessionDate = new Date(year, month - 1, day, hour, minute, 0);
      const reminderDate = new Date(sessionDate.getTime() - 60 * 60 * 1000); // 1 hour before

      if (reminderDate <= now) continue; // Already passed

      // Schedule 1-hour before reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 Session in 1 Hour!',
          body: `Your ${session.session_type || 'Driving'} session starts at ${session.session_time}. Be ready!`,
          data: { sessionId: session.id },
          sound: 'default',
          channelId: 'session-reminders',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: 'session-reminders',
        },
      });

      // Schedule day-before reminder (8 PM the previous evening)
      const dayBeforeReminder = new Date(year, month - 1, day - 1, 20, 0, 0);
      if (dayBeforeReminder > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Session Tomorrow!',
            body: `Reminder: You have a ${session.session_type || 'Driving'} session at ${session.session_time} tomorrow. See you there! 💪`,
            data: { sessionId: session.id },
            sound: 'default',
            channelId: 'session-reminders',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dayBeforeReminder,
            channelId: 'session-reminders',
          },
        });
      }

      scheduledCount++;
      if (scheduledCount >= 10) break; // Limit to next 10 sessions
    }

    // Save last scheduled time
    await AsyncStorage.setItem('lastNotificationSchedule', new Date().toISOString());
    console.log(`✅ Scheduled reminders for ${scheduledCount} upcoming sessions`);
  } catch (err) {
    console.error('Failed to schedule session reminders:', err);
  }
};

// ── Send an instant local notification (for testing or triggers) ──
export const sendInstantNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null, // immediate
    });
  } catch (err) {
    console.error('Failed to send instant notification:', err);
  }
};
