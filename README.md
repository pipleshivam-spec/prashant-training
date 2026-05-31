# 🚗 Prashant Personal Motor Training Coach

**Owner:** Prashant Gaikwad  
**Location:** Manjalpur, Vadodara, Gujarat  
**Phone:** 6879627571  
**Instagram:** @gaikwad.prashants

---

## ⚡ Quick Start (Day 1 Setup)

### Step 1 — Install Node & Expo CLI
```bash
npm install -g expo-cli
```

### Step 2 — Install dependencies
```bash
cd prashant-training
npm install
```

### Step 3 — Add your Supabase Anon Key
Open `src/lib/supabase.js` and replace:
```
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```
Get it from: **supabase.com → your project → Settings → API → anon public**

### Step 4 — Add email column to students table
Run this SQL in Supabase SQL Editor:
```sql
ALTER TABLE students ADD COLUMN IF NOT EXISTS email text;
UPDATE students SET email = 'neha@example.com' WHERE id = 4;
UPDATE students SET email = 'shivam@example.com' WHERE id = 5;
UPDATE students SET email = 'maison@example.com' WHERE id = 6;
```

### Step 5 — Start the app
```bash
npx expo start
```
Scan QR with **Expo Go** app on your phone.

---

## 🗄️ Supabase Tables

| Table | Key Columns | Purpose |
|-------|------------|---------|
| admins | id, username, password, full_name, email | Admin login (Prashant Sir) |
| students | id, name, phone, address, license_type, email | Student records |
| schedules | id(uuid), student_id, session_date, session_time, session_type, duration_minutes, status, notes | Driving sessions |
| attendance | id, session_id, student_id, status, marked_at | Attendance records |
| notifications | id, student_id, message, sent_at | WhatsApp message log |

---

## 📅 10-Day Build Plan

| Day | Task | Status |
|-----|------|--------|
| 1 | Setup + Supabase + Folder Structure | ✅ Done |
| 2 | Login Screen (Admin password + Student magic link) | ⬜ Next |
| 3 | Admin Dashboard | ⬜ |
| 4 | Student Management (Add/Edit/Delete) | ⬜ |
| 5 | Schedule / Calendar | ⬜ |
| 6 | Attendance Tracking | ⬜ |
| 7 | WhatsApp Notifications | ⬜ |
| 8 | Student Screens + Bilingual EN/ગુ | ⬜ |
| 9 | UI Polish + Testing | ⬜ |
| 10 | APK Build | ⬜ |

---

## 🎨 Design System

- **Primary:** Deep Blue `#1A3C6E`
- **Accent:** Gold `#FCD400`
- **Background:** `#f8f9fa`
- **Font:** Plus Jakarta Sans (headings), Manrope (body)
- **Nav:** Glassmorphism bottom tabs

---

## 👥 Current Students in DB

| ID | Name | Phone | License |
|----|------|-------|---------|
| 4 | Neha | 7487896049 | LMV + MCWG |
| 5 | Shivam | 7041318204 | LMV |
| 6 | Maison | 7041757943 | LMV |

---

## 🔐 Admin Credentials (from DB)
- **Username:** prashant  
- **Password:** Prashant@123
