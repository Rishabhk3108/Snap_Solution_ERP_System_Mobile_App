import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getAttendanceList, getDaysWorked } from '../api/attendance';
import { colors } from '../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(t) {
  if (!t) return '—';
  const s = String(t);
  return s.length > 5 ? s.slice(0, 5) : s;
}

function hoursLabel(start, end) {
  if (!start || !end) return '—';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [daysWorked, setDaysWorked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (y, m) => {
    if (!user?.id) return;
    try {
      const [listRes, daysRes] = await Promise.all([
        getAttendanceList(user.id, y, m),
        getDaysWorked(user.id, y, m),
      ]);
      const list = listRes?.data?.attendanceList ?? listRes?.data ?? [];
      setRecords(Array.isArray(list) ? list : []);
      const dw = daysRes?.data?.daysWorked ?? daysRes?.data ?? 0;
      setDaysWorked(typeof dw === 'object' ? (dw?.daysWorked ?? 0) : (dw ?? 0));
    } catch {
      setRecords([]);
      setDaysWorked(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    load(year, month);
  }, [year, month, load]);

  const onRefresh = () => { setRefreshing(true); load(year, month); };

  const totalHours = records.reduce((s, r) => s + (r.numberOfHours ?? r.number_of_hours ?? 0), 0);
  const totalOT = records.reduce((s, r) => s + (r.OtHours ?? r.ot_hours ?? 0), 0);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    if (year === thisYear && month === thisMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <Text style={styles.pageTitle}>My Attendance</Text>
        <Text style={styles.pageSub}>Monthly attendance history</Text>

        {/* Month selector */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]} disabled={isCurrentMonth}>
            <Text style={[styles.monthArrowText, isCurrentMonth && { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.statsRow}>
          {[
            { label: 'Days Worked', value: daysWorked, color: colors.accent },
            { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, color: colors.green },
            { label: 'Overtime', value: `${totalOT}h`, color: colors.amber },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Records */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Records</Text>
            <Text style={styles.cardCount}>{records.length}</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ padding: 32 }} />
          ) : records.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No records for {MONTHS[month - 1]} {year}</Text>
            </View>
          ) : (
            records.map((r, i) => {
              const start = r.startTime ?? r.start_time;
              const end = r.endTime ?? r.end_time;
              const hours = r.numberOfHours ?? r.number_of_hours;
              const ot = r.OtHours ?? r.ot_hours ?? 0;
              const isOngoing = !end;
              return (
                <View key={r.id || i} style={[styles.row, i < records.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowDate}>{r.date}</Text>
                    <Text style={styles.rowTimes}>
                      {fmt(start)} → {isOngoing ? 'Ongoing' : fmt(end)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowHours}>
                      {hours != null ? `${hours}h` : hoursLabel(start, end)}
                      {ot > 0 && <Text style={{ color: colors.amber }}> +{ot}h</Text>}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: isOngoing ? colors.amberBg : colors.greenBg }]}>
                      <Text style={[styles.statusPillText, { color: isOngoing ? colors.amber : colors.green }]}>
                        {isOngoing ? 'Ongoing' : 'Complete'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 2 },
  pageSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 16,
  },
  monthArrow: { padding: 4 },
  monthArrowDisabled: { opacity: 0.3 },
  monthArrowText: { fontSize: 24, color: colors.text, fontWeight: '300', lineHeight: 28 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: colors.text },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 3 },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  card: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardCount: { fontSize: 13, color: colors.textSecondary },

  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textTertiary },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, justifyContent: 'space-between' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.separator },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  rowTimes: { fontSize: 12, color: colors.textSecondary },
  rowRight: { alignItems: 'flex-end', gap: 5 },
  rowHours: { fontSize: 13, fontWeight: '700', color: colors.green },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
});
