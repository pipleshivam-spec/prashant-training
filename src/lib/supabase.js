// src/lib/supabase.js
// NUCLEAR FIX: Direct REST API calls using XMLHttpRequest
// Bypasses all Supabase client fetch issues in Expo Go Android

const SUPABASE_URL = 'https://qqfhtwxvurmhuovvvstw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZmh0d3h2dXJtaHVvdnZ2c3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjMwMTMsImV4cCI6MjA5MTQ5OTAxM30.JGuyzFY5CKWoSq45J9Hr9lpmJzO7k7h2dr8HYaPmj0Y';

// ─────────────────────────────────────────────────────────────
// CORE XHR REQUEST — works on ALL Android/iOS Expo Go versions
// ─────────────────────────────────────────────────────────────
const xhrRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${SUPABASE_URL}/rest/v1/${path}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Prefer', 'return=representation');
    xhr.timeout = 15000;

    xhr.onload = () => {
      try {
        const result = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: result, error: null });
        } else {
          resolve({ data: null, error: { message: result?.message || `Error ${xhr.status}`, code: result?.code } });
        }
      } catch (e) {
        resolve({ data: null, error: { message: 'Failed to parse response' } });
      }
    };

    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Request timed out. Check your internet.'));

    xhr.send(body ? JSON.stringify(body) : null);
  });
};

// GET with query string
const xhrGet = (table, queryString = '') => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${SUPABASE_URL}/rest/v1/${table}?${queryString}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.timeout = 15000;

    xhr.onload = () => {
      try {
        const result = xhr.responseText ? JSON.parse(xhr.responseText) : [];
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: Array.isArray(result) ? result : [result], error: null });
        } else {
          resolve({ data: null, error: { message: result?.message || `Error ${xhr.status}` } });
        }
      } catch (e) {
        resolve({ data: null, error: { message: 'Parse error' } });
      }
    };

    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));
    xhr.send(null);
  });
};

// MULTIPART / BINARY UPLOAD for Storage
const xhrUpload = (bucket, filename, fileUri) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`;
    
    xhr.open('POST', url);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.timeout = 30000;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`, error: null });
      } else {
        const res = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        resolve({ data: null, error: res });
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    
    // Convert URI to Blob for XHR
    fetch(fileUri)
      .then(res => res.blob())
      .then(blob => {
        xhr.setRequestHeader('Content-Type', blob.type || 'image/jpeg');
        xhr.send(blob);
      })
      .catch(err => resolve({ data: null, error: { message: 'File processing failed' } }));
  });
};

// ─────────────────────────────────────────────────────────────
// ADMINS
// ─────────────────────────────────────────────────────────────
export const adminLogin = async (username, password) => {
  // ── HARDCODED BYPASS FOR TESTING ──────────────────────────
  if (username.trim() === 'admin' && (password.trim() === 'admin123' || password.trim() === 'admin')) {
    return { data: { id: 1, username: 'admin', name: 'Prashant Sir' }, error: null };
  }
  // ──────────────────────────────────────────────────────────

  try {
    const { data, error } = await xhrGet(
      'admins',
      `username=eq.${encodeURIComponent(username.trim())}&password=eq.${encodeURIComponent(password.trim())}&select=*`
    );
    if (error) return { data: null, error };
    if (!data || data.length === 0) {
      return { data: null, error: { message: 'Invalid username or password.' } };
    }
    return { data: data[0], error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────
export const getStudents = async () => {
  try {
    return await xhrGet('students', 'select=*&order=created_at.desc');
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getActiveStudents = async () => {
  try {
    return await xhrGet('students', 'status=eq.active&select=*&order=joining_date.desc');
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getStudentById = async (id) => {
  try {
    const { data, error } = await xhrGet('students', `id=eq.${id}&select=*`);
    return { data: data?.[0] || null, error };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getStudentByAuthId = async (authUserId) => {
  try {
    const { data, error } = await xhrGet('students', `auth_user_id=eq.${authUserId}&select=*`);
    return { data: data?.[0] || null, error };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getStudentByEmail = async (email) => {
  try {
    const { data, error } = await xhrGet('students', `email=eq.${encodeURIComponent(email)}&select=*`);
    return { data: data?.[0] || null, error };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const addStudent = async (student) => {
  try {
    return await xhrRequest('POST', 'students', { ...student, status: student.status || 'active' });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const updateStudent = async (id, updates) => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', `${SUPABASE_URL}/rest/v1/students?id=eq.${id}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Prefer', 'return=representation');
      xhr.timeout = 15000;
      xhr.onload = () => {
        const result = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: Array.isArray(result) ? result[0] : result, error: null });
        } else {
          resolve({ data: null, error: { message: result?.message || 'Update failed' } });
        }
      };
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.send(JSON.stringify(updates));
    });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const deleteStudent = async (id) => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', `${SUPABASE_URL}/rest/v1/students?id=eq.${id}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.timeout = 15000;
      xhr.onload = () => resolve({ error: null });
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.send(null);
    });
  } catch (err) {
    return { error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// SCHEDULES
// ─────────────────────────────────────────────────────────────
export const getSchedules = async () => {
  try {
    return await xhrGet('schedules', 'select=*,students(id,name,phone,email,avatar_url)&order=session_date.asc,session_time.asc');
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getTodaySchedules = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await xhrGet(
      'schedules',
      `session_date=eq.${today}&select=*,students(id,name,phone,email,avatar_url)&order=session_time.asc`
    );
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: { message: err.message } };
  }
};

export const getSchedulesByStudent = async (studentId) => {
  try {
    return await xhrGet('schedules', `student_id=eq.${studentId}&select=*&order=session_date.asc`);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getUpcomingSchedulesByStudent = async (studentId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    return await xhrGet(
      'schedules',
      `student_id=eq.${studentId}&session_date=gte.${today}&select=*&order=session_date.asc`
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getStudentSchedules = async (studentId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    return await xhrGet(
      'schedules',
      `student_id=eq.${studentId}&session_date=gte.${today}&select=*&order=session_date.asc,session_time.asc`
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getScheduleById = async (id) => {
  try {
    const { data, error } = await xhrGet('schedules', `id=eq.${id}&select=*,students(id,name,phone,email,avatar_url)`);
    return { data: data?.[0] || null, error };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const addSchedule = async (schedule) => {
  try {
    return await xhrRequest('POST', 'schedules', schedule);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const updateSchedule = async (id, updates) => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', `${SUPABASE_URL}/rest/v1/schedules?id=eq.${id}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Prefer', 'return=representation');
      xhr.timeout = 15000;
      xhr.onload = () => {
        const result = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        resolve({ data: Array.isArray(result) ? result[0] : result, error: null });
      };
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.send(JSON.stringify(updates));
    });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const deleteSchedule = async (id) => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', `${SUPABASE_URL}/rest/v1/schedules?id=eq.${id}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.timeout = 15000;
      xhr.onload = () => resolve({ error: null });
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.send(null);
    });
  } catch (err) {
    return { error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────
export const getAttendance = async () => {
  try {
    return await xhrGet(
      'attendance',
      'select=*,students(name,email,avatar_url),schedules(session_date,session_time,session_type)&order=marked_at.desc'
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getAttendanceByStudent = async (studentId) => {
  try {
    return await xhrGet(
      'attendance',
      `student_id=eq.${studentId}&select=*,schedules(session_date,session_time,session_type)&order=marked_at.desc`
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getAttendanceStats = async () => {
  try {
    const { data, error } = await xhrGet('attendance', 'select=session_id,student_id,status,marked_at');
    if (error) return { total: 0, present: 0, percent: 0, error };

    // Deduplicate: group by session_id (or student+date as fallback)
    // so that multiple rows for the same session count as ONE session only.
    const presentKeys  = new Set();
    const allKeys      = new Set();

    (data || []).forEach(record => {
      const dateKey = record.marked_at ? record.marked_at.substring(0, 10) : 'nd';
      const key = record.session_id
        ? `S${record.session_id}`
        : `D${record.student_id}_${dateKey}`;

      allKeys.add(key);
      if (record.status === 'present') presentKeys.add(key);
    });

    const total   = allKeys.size;
    const present = presentKeys.size;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percent, error: null };
  } catch (err) {
    return { total: 0, present: 0, percent: 0, error: { message: err.message } };
  }
};

export const getAttendanceStatsByStudent = async (studentId) => {
  try {
    const { data, error } = await xhrGet('attendance', `student_id=eq.${studentId}&select=status`);
    if (error) return { total: 0, present: 0, percent: 0, error };
    const total   = data?.length || 0;
    const present = data?.filter(r => r.status === 'present').length || 0;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percent, error: null };
  } catch (err) {
    return { total: 0, present: 0, percent: 0, error: { message: err.message } };
  }
};

export const markAttendance = async (sessionId, studentId, status) => {
  try {
    return await xhrRequest('POST', 'attendance', {
      session_id: sessionId,
      student_id: studentId,
      status,
      marked_at: new Date().toISOString(),
    });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const upsertAttendance = async (record) => {
  try {
    // Find any existing record for this session
    const { data: existing } = await xhrGet('attendance', `session_id=eq.${record.session_id}&select=id&limit=1`);

    if (existing && existing.length > 0) {
      // PATCH the first existing record (update status in place)
      const id = existing[0].id;
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PATCH', `${SUPABASE_URL}/rest/v1/attendance?id=eq.${id}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Prefer', 'return=representation');
        xhr.timeout = 15000;
        xhr.onload = () => {
          try {
            const result = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            if (xhr.status >= 200 && xhr.status < 300) resolve({ data: result, error: null });
            else resolve({ data: null, error: { message: result?.message || `Error ${xhr.status}` } });
          } catch (e) {
            resolve({ data: null, error: { message: 'Parse error' } });
          }
        };
        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.send(JSON.stringify({ status: record.status, marked_at: record.marked_at }));
      });
    } else {
      // No existing record — insert fresh
      return await xhrRequest('POST', 'attendance', record);
    }
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};


export const getTodayAttendance = async (sessionIds = []) => {
  try {
    if (!sessionIds || sessionIds.length === 0) return { data: [], error: null };
    const ids = sessionIds.join(',');
    return await xhrGet('attendance', `session_id=in.(${ids})&select=*`);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

// Returns today's unique present sessions count and revenue
export const getTodayRevenueStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Get today's schedule IDs
    const schedulesRes = await xhrGet('schedules', `session_date=eq.${today}&select=id`);
    const todaySessionIds = (schedulesRes.data || []).map(s => s.id);
    if (todaySessionIds.length === 0) return { todayPresent: 0, todayRevenue: 0 };

    // Get attendance only for today's sessions
    const ids = todaySessionIds.join(',');
    const attRes = await xhrGet('attendance', `session_id=in.(${ids})&select=session_id,status`);

    // Count unique sessions marked present (Set removes any duplicates)
    const presentSessions = new Set();
    (attRes.data || []).forEach(r => {
      if (r.status === 'present' && r.session_id) {
        presentSessions.add(r.session_id);
      }
    });

    const todayPresent = presentSessions.size;
    return { todayPresent, todayRevenue: todayPresent * 400 };
  } catch (err) {
    return { todayPresent: 0, todayRevenue: 0 };
  }
};

export const getAttendanceRecords = async (studentId = null, date = null) => {
  try {
    let query = 'select=*,students(name,avatar_url),schedules(session_date,session_time)&order=marked_at.desc';
    if (studentId && studentId !== 'All') query += `&student_id=eq.${studentId}`;
    if (date) query += `&marked_at=gte.${date}T00:00:00Z&marked_at=lte.${date}T23:59:59Z`;
    return await xhrGet('attendance', query);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export const getNotifications = async (limit = null) => {
  try {
    let query = 'select=*,students(name,phone,email,avatar_url)&order=sent_at.desc';
    if (limit) query += `&limit=${limit}`;
    return await xhrGet('notifications', query);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getStudentNotifications = async (studentId) => {
  try {
    const query = `select=*&or=(student_id.eq.${studentId},student_id.is.null)&order=sent_at.desc`;
    return await xhrGet('notifications', query);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const logNotification = async (studentId, message) => {
  try {
    return await xhrRequest('POST', 'notifications', {
      student_id: studentId,
      message,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const addNotification = logNotification;

export const getNotificationStats = async () => {
  try {
    const { data, error } = await xhrGet('notifications', 'select=id,student_id,sent_at');
    if (error) return { total: 0, today: 0, students: 0, error };

    const total = data?.length || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = data?.filter(n => n.sent_at && n.sent_at.startsWith(todayStr)).length || 0;
    const uniqueStudents = new Set(data?.map(n => n.student_id)).size;

    return { total, today: todayCount, students: uniqueStudents, error: null };
  } catch (err) {
    return { total: 0, today: 0, students: 0, error: { message: err.message } };
  }
};


export const sendMagicLink = async (email) => {
  try {
    const { data: students } = await xhrGet(
      'students',
      `email=eq.${encodeURIComponent(email)}&select=id,name,email,status`
    );
    
    const student = students && students.length > 0 ? students[0] : null;
    if (student && student.status === 'inactive') {
      return { error: { message: 'Your account has been deactivated.' } };
    }

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${SUPABASE_URL}/auth/v1/otp`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 15000;
      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ error: null, student: student });
          } else {
            const result = JSON.parse(xhr.responseText || '{}');
            resolve({ error: { message: result.error_description || result.msg || `Error ${xhr.status}` } });
          }
        } catch (e) {
          resolve({ error: { message: 'Invalid response from auth server' } });
        }
      };
      xhr.onerror = () => resolve({ error: { message: 'Network error sending login code' } });
      xhr.ontimeout = () => resolve({ error: { message: 'Timeout sending login code' } });
      xhr.send(JSON.stringify({ email, create_user: true }));
    });
  } catch (err) {
    return { error: { message: err.message } };
  }
};

export const verifyOtp = async (email, token) => {
  const tryVerify = (type) => new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/auth/v1/verify`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: result, error: null });
        } else {
          resolve({ data: null, error: { message: result.error_description || result.msg || `Error ${xhr.status}` } });
        }
      } catch (e) {
        resolve({ data: null, error: { message: 'Verification parse error' } });
      }
    };
    xhr.onerror = () => resolve({ data: null, error: { message: 'Network error verifying code' } });
    xhr.ontimeout = () => resolve({ data: null, error: { message: 'Timeout verifying code' } });
    xhr.send(JSON.stringify({ email, token, type })); 
  });

  try {
    let res = await tryVerify('magiclink');
    if (res.error) {
      res = await tryVerify('signup');
    }
    if (res.error) {
      res = await tryVerify('email');
    }
    return res;
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getSession = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const role = await AsyncStorage.getItem('userRole');
    return { session: role ? { role } : null, error: null };
  } catch (err) {
    return { session: null, error: { message: err.message } };
  }
};

export const signOut = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('adminData');
    await AsyncStorage.removeItem('studentData');
    return { error: null };
  } catch (err) {
    return { error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
export const getAdminDashboardStats = async () => {
  try {
    const [studentsRes, schedulesRes, todayRes, attendanceRes, todayRevRes, notificationsRes] = await Promise.all([
      getActiveStudents(),
      getSchedules(),
      getTodaySchedules(),
      getAttendanceStats(),
      getTodayRevenueStats(),   // ← only counts today's present sessions
      getNotifications(3),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newStudentsWeek = studentsRes.data?.filter(s =>
      s.joining_date && new Date(s.joining_date) >= sevenDaysAgo
    ).length || 0;

    // Revenue = today's unique present sessions × ₹400 only
    const totalRevenue = todayRevRes.todayRevenue || 0;

    return {
      data: {
        activeStudents:    studentsRes.data?.length || 0,
        newStudentsWeek:   newStudentsWeek,
        totalSessions:     schedulesRes.data?.length || 0,
        todaysSessions:    todayRes.data             || [],
        todaysCount:       todayRes.data?.length     || 0,
        attendancePercent: attendanceRes.percent      || 0,
        totalRevenue:      totalRevenue,
        recentActivity:    notificationsRes.data      || [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};


// ─── Student Functions (Day 8) ────────────────────────────────────────

/**
 * Get student profile by ID
 */
export const getStudentProfile = async (studentId) => {
  try {
    return await xhrGet('students', `id=eq.${studentId}&select=*`);
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (studentId, fileUri) => {
  try {
    const filename = `student_${studentId}.jpg`;
    const { data: url, error } = await xhrUpload('avatars', filename, fileUri);
    if (error) return { data: null, error };

    // Update students table
    await updateStudent(studentId, { avatar_url: url });
    return { data: url, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Get all schedules for a student
 */
export const getStudentSchedulesFull = async (studentId) => {
  try {
    return await xhrGet(
      'schedules', 
      `student_id=eq.${studentId}&select=*&order=session_date.desc,session_time.desc`
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Get next upcoming session for a student
 */
export const getNextSession = async (studentId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await xhrGet(
      'schedules',
      `student_id=eq.${studentId}&status=eq.Scheduled&session_date=gte.${today}&select=*&order=session_date.asc,session_time.asc&limit=1`
    );
    return { data: res.data ? res.data[0] : null, error: res.error };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

/**
 * Get all attendance records for a student
 */
export const getStudentAttendanceList = async (studentId) => {
  try {
    return await xhrGet(
      'attendance',
      `student_id=eq.${studentId}&select=*,schedules(session_date,session_time,session_type)&order=marked_at.desc`
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// SESSION FEEDBACK (Feature 4)
// Table: session_feedback (id, student_id, session_id, rating, comment, created_at)
// ─────────────────────────────────────────────────────────────

export const submitSessionFeedback = async (studentId, sessionId, rating, comment = '') => {
  try {
    const { data: existing } = await xhrGet(
      'session_feedback',
      `student_id=eq.${studentId}&session_id=eq.${sessionId}&select=id`
    );
    if (existing && existing.length > 0) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PATCH', `${SUPABASE_URL}/rest/v1/session_feedback?id=eq.${existing[0].id}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Prefer', 'return=representation');
        xhr.timeout = 15000;
        xhr.onload = () => resolve({ data: null, error: null });
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(JSON.stringify({ rating, comment, created_at: new Date().toISOString() }));
      });
    }
    return await xhrRequest('POST', 'session_feedback', {
      student_id: studentId,
      session_id: sessionId,
      rating,
      comment,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getSessionFeedbackMap = async (studentId) => {
  try {
    const { data, error } = await xhrGet(
      'session_feedback',
      `student_id=eq.${studentId}&select=session_id,rating,comment`
    );
    const map = {};
    (data || []).forEach(f => { map[f.session_id] = f; });
    return { data: map, error };
  } catch (err) {
    return { data: {}, error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// RESCHEDULE REQUESTS (Feature 5)
// Table: reschedule_requests (id, student_id, session_id, preferred_date, preferred_time, reason, status, created_at)
// ─────────────────────────────────────────────────────────────

export const submitRescheduleRequest = async (studentId, sessionId, preferredDate, preferredTime, reason = '') => {
  try {
    return await xhrRequest('POST', 'reschedule_requests', {
      student_id: studentId,
      session_id: sessionId,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getRescheduleRequestMap = async (studentId) => {
  try {
    const { data, error } = await xhrGet(
      'reschedule_requests',
      `student_id=eq.${studentId}&select=session_id,status,preferred_date,preferred_time`
    );
    const map = {};
    (data || []).forEach(r => { map[r.session_id] = r; });
    return { data: map, error };
  } catch (err) {
    return { data: {}, error: { message: err.message } };
  }
};

// ─────────────────────────────────────────────────────────────
// PAYMENT SUMMARY (Feature 8)
// Table: payments (id, student_id, amount, payment_date, mode, note)
// ─────────────────────────────────────────────────────────────

export const getStudentPayments = async (studentId) => {
  try {
    return await xhrGet(
      'payments',
      `student_id=eq.${studentId}&select=*&order=payment_date.desc`
    );
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};

export const getStudentFeeInfo = async (studentId) => {
  try {
    const FEE_PER_SESSION = 400; // ₹400 per session

    const [attendanceRes, paymentsRes] = await Promise.all([
      // Count only sessions marked 'present' by admin
      xhrGet('attendance', `student_id=eq.${studentId}&status=eq.present&select=id`),
      xhrGet('payments', `student_id=eq.${studentId}&select=amount,payment_date,mode,note`),
    ]);

    const presentSessions = (attendanceRes.data || []).length;
    const sessionFee = presentSessions * FEE_PER_SESSION;   // total fee generated from sessions
    const paid = (paymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = Math.max(0, sessionFee - paid);

    return {
      data: {
        presentSessions,          // how many sessions attended
        sessionFee,               // presentSessions × ₹400
        paid,                     // actual payments recorded by admin
        balance,                  // still owed
        payments: paymentsRes.data || [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
};
