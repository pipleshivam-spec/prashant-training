import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Components ───────────────────────────────────────────────
import AnimatedSplash from '../components/AnimatedSplash';

// ── Auth ─────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';

// ── Admin Screens ─────────────────────────────────────────────
import AdminDashboard from '../screens/admin/AdminDashboard';
import StudentList    from '../screens/admin/StudentList';
import Schedule       from '../screens/admin/Schedule';
import Attendance     from '../screens/admin/Attendance';
import AddStudent     from '../screens/admin/AddStudent';
import AddSchedule    from '../screens/admin/AddSchedule';
import Notifications  from '../screens/admin/Notifications';
import SessionDetail   from '../screens/admin/SessionDetail';
import RevenueTracker  from '../screens/admin/RevenueTracker';
import StudentReport   from '../screens/admin/StudentReport';
import SessionNotes    from '../screens/admin/SessionNotes';
import ReminderSetup   from '../screens/admin/ReminderSetup';

// ── Student Screens ───────────────────────────────────────────
import StudentDashboard from '../screens/student/StudentDashboard';
import ProfileSetup    from '../screens/student/ProfileSetup';
import Profile         from '../screens/student/Profile';
import MySchedule       from '../screens/student/MySchedule';
import MyAttendance     from '../screens/student/MyAttendance';
import PaymentSummary   from '../screens/student/PaymentSummary';
import Announcements    from '../screens/student/Announcements';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const BLUE = '#1A3C6E';
const GOLD = '#FCD400';

const ADMIN_ICONS = {
  Dashboard:  ['home',     'home-outline'],
  Students:   ['people',   'people-outline'],
  Schedule:   ['calendar', 'calendar-outline'],
  Attendance: ['checkbox', 'checkbox-outline'],
};

const STUDENT_ICONS = {
  Home:         ['home',      'home-outline'],
  MySchedule:   ['calendar',  'calendar-outline'],
  MyAttendance: ['bar-chart', 'bar-chart-outline'],
  Profile:      ['person',    'person-outline'],
};

const tabScreenOptions = (iconMap) => ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor:   GOLD,
  tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
  tabBarStyle: {
    backgroundColor: BLUE,
    borderTopWidth: 0,
    elevation: 20,
    height: 62,
    paddingBottom: 8,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  tabBarIcon: ({ focused, color }) => {
    const [active, inactive] = iconMap[route.name] || ['home', 'home-outline'];
    return <Ionicons name={focused ? active : inactive} size={22} color={color} />;
  },
});

// ── Admin Tab Navigator ───────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(ADMIN_ICONS)}>
      <Tab.Screen name="Dashboard"  component={AdminDashboard} />
      <Tab.Screen name="Students"   component={StudentList} />
      <Tab.Screen name="Schedule"   component={Schedule} />
      <Tab.Screen name="Attendance" component={Attendance} />
    </Tab.Navigator>
  );
}

// ── Student Tab Navigator ─────────────────────────────────────
function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(STUDENT_ICONS)}>
      <Tab.Screen name="Home"         component={StudentDashboard} />
      <Tab.Screen name="MySchedule"   component={MySchedule}   options={{ title: 'Schedule' }} />
      <Tab.Screen name="MyAttendance" component={MyAttendance} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Profile"      component={Profile} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────
export default function AppNavigator() {
  const [initialRoute,   setInitialRoute]   = useState(null);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const role = await AsyncStorage.getItem('userRole');
        if      (role === 'admin')   setInitialRoute('AdminTabs');
        else if (role === 'student') setInitialRoute('StudentTabs');
        else                         setInitialRoute('LoginScreen');
      } catch (e) {
        setInitialRoute('LoginScreen');
      }
    }
    checkAuth();
  }, []);

  if (!initialRoute || !splashFinished) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <AnimatedSplash onFinish={() => setSplashFinished(true)} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {/* ── Auth ────────────────────────────── */}
        <Stack.Screen name="LoginScreen" component={LoginScreen} />

        {/* ── Admin ───────────────────────────── */}
        <Stack.Screen name="AdminTabs"    component={AdminTabs} />
        <Stack.Screen name="AddStudent"   component={AddStudent} />
        <Stack.Screen name="AddSchedule"  component={AddSchedule} />
        <Stack.Screen name="Notifications"  component={Notifications} />
        <Stack.Screen name="SessionDetail"  component={SessionDetail} />
        <Stack.Screen name="RevenueTracker"  component={RevenueTracker} />
        <Stack.Screen name="StudentReport"   component={StudentReport} />
        <Stack.Screen name="SessionNotes"    component={SessionNotes} />
        <Stack.Screen name="ReminderSetup"   component={ReminderSetup} />

        {/* ── Student ─────────────────────────── */}
        <Stack.Screen name="StudentTabs"    component={StudentTabs} />
        <Stack.Screen name="ProfileSetup"   component={ProfileSetup} />
        <Stack.Screen name="PaymentSummary" component={PaymentSummary} />
        <Stack.Screen name="Announcements"  component={Announcements} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
