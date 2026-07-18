import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { getAttendanceStatus, checkIn, checkOut } from '../api/attendance';
import { getTodayDate, getCurrentTime, getYearMonth, formatDisplayDate } from '../utils/dateTime';
import { colors } from '../theme';

const STATUS = {
  A:  { label: 'Not Checked In', color: colors.textSecondary, bg: colors.bg,      dot: '#D1D5DB' },
  NC: { label: 'Checked In',     color: colors.green,          bg: colors.greenBg, dot: colors.green },
  P:  { label: 'Present',        color: colors.green,          bg: colors.greenBg, dot: colors.green },
  H:  { label: 'Half Day',       color: colors.amber,          bg: colors.amberBg, dot: colors.amber },
  L:  { label: 'On Leave',       color: colors.purple,         bg: colors.purpleBg,dot: colors.purple },
  R:  { label: 'Rest Day',       color: colors.blue,           bg: colors.blueBg,  dot: colors.blue },
};

export default function HomeScreen({ navigation }) {
  const { user, projectId, saveProjectId } = useAuth();
  const [status, setStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(getCurrentTime());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(getCurrentTime()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await getAttendanceStatus(user.id, getTodayDate());
      setStatus(data.status ?? 'A');
    } catch {
      setStatus('A');
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => { fetchStatus(); }, [fetchStatus])
  );

  useEffect(() => {
    const init = async () => {
      await resolveProject();
      await fetchStatus();
      setPageLoading(false);
    };
    init();
  }, []);

  const resolveProject = async () => {
    if (projectId) return;

    // Use the projectId that came with the login response
    if (user?.projectId) {
      await saveProjectId(user.projectId);
      return;
    }

    // Fallback: ask admin to assign the employee to a project
    Alert.alert(
      'No Project Assigned',
      'You have not been assigned to a project yet. Please contact your admin.',
      [{ text: 'OK' }]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!projectId) {
      Alert.alert(
        'No Project Assigned',
        'Could not detect your project. Please contact your admin or try refreshing.',
        [{ text: 'Retry', onPress: resolveProject }, { text: 'Cancel', style: 'cancel' }],
      );
      return;
    }

    // Biometric identity verification (Face ID / fingerprint)
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify your identity to check in',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        if (!auth.success) {
          Alert.alert('Verification Failed', 'Identity not confirmed. Check-in cancelled.');
          return;
        }
      }
    } catch {
      // Biometrics unavailable — proceed without it
    }

    // Get GPS location
    setCheckingIn(true);
    let locationStr = 'Unknown';
    try {
      await Location.requestForegroundPermissionsAsync();
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      locationStr = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
    } catch {}

    // Mark attendance
    try {
      const { year, month } = getYearMonth();
      await checkIn({
        empid: user.id,
        projectId,
        date: getTodayDate(),
        startTime: getCurrentTime(),
        location: locationStr,
        year,
        month,
      });
      await fetchStatus();
    } catch (err) {
      Alert.alert(
        'Check In Failed',
        err?.response?.data?.detail || err?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = () => {
    Alert.alert('Confirm Check Out', 'Are you sure you want to check out now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        onPress: async () => {
          setCheckingOut(true);
          try {
            await checkOut({ empid: user.id, date: getTodayDate(), endTime: getCurrentTime() });
            await fetchStatus();
          } catch (err) {
            Alert.alert('Check Out Failed', err.response?.data?.detail || 'Something went wrong. Please try again.');
          } finally {
            setCheckingOut(false);
          }
        },
      },
    ]);
  };

  const cfg = STATUS[status] ?? STATUS.A;
  const [hh, mm, ss] = clock.split(':');
  const firstName = user?.fullname?.split(' ')[0] ?? user?.username ?? 'there';

  if (pageLoading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {firstName}</Text>
            <Text style={styles.dateLabel}>{formatDisplayDate()}</Text>
          </View>
        </View>

        {/* Clock card */}
        <View style={styles.clockCard}>
          <View style={styles.clockRow}>
            <Text style={styles.clockHHMM}>{hh}:{mm}</Text>
            <Text style={styles.clockSS}>:{ss}</Text>
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Action */}
        <View style={styles.actionWrap}>
          {(status === 'A' || status === null) && (
            <TouchableOpacity
              style={[styles.checkInBtn, checkingIn && styles.disabled]}
              onPress={handleCheckIn}
              disabled={checkingIn}
              activeOpacity={0.88}
            >
              {checkingIn ? (
                <ActivityIndicator color={colors.accentText} size="large" />
              ) : (
                <>
                  <Text style={styles.actionLabel}>Check In</Text>
                  <Text style={styles.actionHint}>Uses Face ID / fingerprint to verify</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {status === 'NC' && (
            <TouchableOpacity style={styles.checkOutBtn} onPress={handleCheckOut} disabled={checkingOut} activeOpacity={0.88}>
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={[styles.actionLabel, { color: '#fff' }]}>Check Out</Text>
                  <Text style={[styles.actionHint, { color: 'rgba(255,255,255,0.7)' }]}>Tap to end your working day</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {(status === 'P' || status === 'H') && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>✓</Text>
              <Text style={styles.infoText}>Attendance recorded for today</Text>
            </View>
          )}

          {status === 'L' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>You are on approved leave today</Text>
            </View>
          )}

          {status === 'R' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🏖</Text>
              <Text style={styles.infoText}>Today is a scheduled rest day</Text>
            </View>
          )}
        </View>

        <Text style={styles.pullHint}>Pull down to refresh</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  dateLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },

  clockCard: {
    backgroundColor: colors.card, borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, padding: 28, alignItems: 'center',
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  clockRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  clockHHMM: { fontSize: 72, fontWeight: '200', color: colors.text, letterSpacing: -2, lineHeight: 80 },
  clockSS: { fontSize: 28, fontWeight: '300', color: colors.textTertiary, marginBottom: 8, marginLeft: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600' },

  actionWrap: { flex: 1 },
  checkInBtn: {
    backgroundColor: colors.accent, borderRadius: 18,
    paddingVertical: 26, alignItems: 'center',
  },
  checkOutBtn: {
    backgroundColor: colors.green, borderRadius: 18,
    paddingVertical: 26, alignItems: 'center',
  },
  actionLabel: { color: colors.accentText, fontSize: 22, fontWeight: '800' },
  actionHint: { color: 'rgba(31,31,31,0.55)', fontSize: 13, marginTop: 5 },
  disabled: { opacity: 0.6 },

  infoCard: {
    backgroundColor: colors.card, borderRadius: 18, paddingVertical: 28,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  infoIcon: { fontSize: 28 },
  infoText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },

  pullHint: { color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 24 },
});
