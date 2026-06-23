import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { mobileAPI } from '../services/api';
import {
  getCurrentLocation,
  reverseGeocode,
  startLocationTracking,
  stopLocationTracking,
  sendSingleLocation,
} from '../services/locationService';

interface TodayAttendance {
  punchIn?: { time: string; location?: { address: string; latitude: number; longitude: number } };
  punchOut?: { time: string };
  workMode: string;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  status: string;
}

const workModeLabels: Record<string, { label: string; color: string; bg: string }> = {
  office: { label: 'Office', color: '#1e40af', bg: '#dbeafe' },
  wfh: { label: 'Work From Home', color: '#15803d', bg: '#dcfce7' },
  field: { label: 'Field Work', color: '#c2410c', bg: '#ffedd5' },
};

const DashboardScreen: React.FC = () => {
  const { user, tenant, logout, updateWorkMode } = useAuth();
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [locationUpdates, setLocationUpdates] = useState(0);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('Fetching location...');
  const [isTracking, setIsTracking] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState<boolean | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await mobileAPI.getDashboard();
      const data = res.data.data;
      setAttendance(data.todayAttendance);
      setLocationUpdates(data.locationUpdates || 0);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCurrentLocation = useCallback(async () => {
    const coords = await getCurrentLocation();
    if (coords) {
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      setCurrentAddress(addr);

      const result = await sendSingleLocation(coords);
      if (result) {
        setGeofenceStatus(result.isInsideGeofence);
      }
    } else {
      setCurrentAddress('Location unavailable');
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchCurrentLocation();
  }, [fetchDashboard, fetchCurrentLocation]);

  const handlePunchIn = async () => {
    setPunching(true);
    try {
      const coords = await getCurrentLocation();
      let address = '';
      if (coords) {
        address = await reverseGeocode(coords.latitude, coords.longitude);
      }

      await mobileAPI.punchIn({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        accuracy: coords?.accuracy || undefined,
        address,
        workMode: user?.workMode,
      });

      Alert.alert('Success', 'Punched In successfully!');
      fetchDashboard();

      const interval = tenant?.settings?.mobileLocationInterval || 15;
      await startLocationTracking(interval);
      setIsTracking(true);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert('Error', err.response?.data?.message || 'Punch in failed');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    Alert.alert('Confirm', 'Are you sure you want to punch out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Punch Out',
        style: 'destructive',
        onPress: async () => {
          setPunching(true);
          try {
            const coords = await getCurrentLocation();
            let address = '';
            if (coords) {
              address = await reverseGeocode(coords.latitude, coords.longitude);
            }

            await mobileAPI.punchOut({
              latitude: coords?.latitude,
              longitude: coords?.longitude,
              accuracy: coords?.accuracy || undefined,
              address,
            });

            stopLocationTracking();
            setIsTracking(false);

            Alert.alert('Success', 'Punched Out successfully!');
            fetchDashboard();
          } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
            Alert.alert('Error', err.response?.data?.message || 'Punch out failed');
          } finally {
            setPunching(false);
          }
        },
      },
    ]);
  };

  const handleWorkModeChange = (mode: 'office' | 'wfh' | 'field') => {
    Alert.alert('Change Work Mode', `Switch to ${workModeLabels[mode].label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await updateWorkMode(mode);
            Alert.alert('Updated', `Work mode changed to ${workModeLabels[mode].label}`);
          } catch {
            Alert.alert('Error', 'Failed to update work mode');
          }
        },
      },
    ]);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const isPunchedIn = attendance?.punchIn?.time && !attendance?.punchOut?.time;
  const currentWorkMode = user?.workMode || 'office';
  const modeConfig = workModeLabels[currentWorkMode] || workModeLabels.office;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); fetchCurrentLocation(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
          <Text style={styles.subGreeting}>{user?.designation || user?.department || user?.role}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: modeConfig.bg }]}>
        <Text style={[styles.cardTitle, { color: modeConfig.color }]}>Current Work Mode</Text>
        <Text style={[styles.workModeText, { color: modeConfig.color }]}>{modeConfig.label}</Text>
        <View style={styles.workModeButtons}>
          {(['office', 'wfh', 'field'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => handleWorkModeChange(mode)}
              style={[
                styles.modeBtn,
                currentWorkMode === mode && { backgroundColor: workModeLabels[mode].color },
              ]}
            >
              <Text style={[styles.modeBtnText, currentWorkMode === mode && { color: '#fff' }]}>
                {workModeLabels[mode].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Location</Text>
        <Text style={styles.locationText}>{currentAddress}</Text>
        {geofenceStatus !== null && (
          <View style={[styles.geofenceBadge, geofenceStatus ? styles.insideGeofence : styles.outsideGeofence]}>
            <Text style={styles.geofenceText}>
              {geofenceStatus ? 'Inside Office Geofence' : 'Outside Office Geofence'}
            </Text>
          </View>
        )}
        {isTracking && (
          <Text style={styles.trackingText}>Location tracking active - {locationUpdates} updates today</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Punch In</Text>
          <Text style={styles.attendanceValue}>
            {attendance?.punchIn?.time ? formatTime(attendance.punchIn.time) : '-'}
          </Text>
        </View>
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Punch Out</Text>
          <Text style={styles.attendanceValue}>
            {attendance?.punchOut?.time ? formatTime(attendance.punchOut.time) : '-'}
          </Text>
        </View>
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Total Work</Text>
          <Text style={styles.attendanceValue}>{formatMinutes(attendance?.totalWorkMinutes || 0)}</Text>
        </View>
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Status</Text>
          <View style={[styles.statusBadge,
            attendance?.status === 'present' ? styles.statusPresent :
            attendance?.status === 'late' ? styles.statusLate :
            styles.statusDefault
          ]}>
            <Text style={styles.statusText}>{attendance?.status || 'Not Punched In'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.punchSection}>
        {!attendance?.punchIn?.time ? (
          <TouchableOpacity
            style={[styles.punchButton, styles.punchInBtn]}
            onPress={handlePunchIn}
            disabled={punching}
          >
            {punching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.punchButtonText}>Punch In</Text>
            )}
          </TouchableOpacity>
        ) : isPunchedIn ? (
          <TouchableOpacity
            style={[styles.punchButton, styles.punchOutBtn]}
            onPress={handlePunchOut}
            disabled={punching}
          >
            {punching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.punchButtonText}>Punch Out</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.completedCard}>
            <Text style={styles.completedText}>Work day completed</Text>
            <Text style={styles.completedSubtext}>
              {formatMinutes(attendance?.totalWorkMinutes || 0)} worked today
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e40af',
  },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 14, color: '#93c5fd', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workModeText: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  workModeButtons: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  locationText: { fontSize: 16, color: '#334155', marginBottom: 8 },
  geofenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  insideGeofence: { backgroundColor: '#dcfce7' },
  outsideGeofence: { backgroundColor: '#fef3c7' },
  geofenceText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  trackingText: { fontSize: 12, color: '#64748b', marginTop: 8 },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  attendanceLabel: { fontSize: 14, color: '#64748b' },
  attendanceValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPresent: { backgroundColor: '#dcfce7' },
  statusLate: { backgroundColor: '#fef9c3' },
  statusDefault: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  punchSection: { marginHorizontal: 16, marginTop: 20 },
  punchButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  punchInBtn: { backgroundColor: '#16a34a' },
  punchOutBtn: { backgroundColor: '#dc2626' },
  punchButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  completedCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  completedText: { fontSize: 18, fontWeight: 'bold', color: '#16a34a' },
  completedSubtext: { fontSize: 14, color: '#64748b', marginTop: 4 },
});

export default DashboardScreen;
