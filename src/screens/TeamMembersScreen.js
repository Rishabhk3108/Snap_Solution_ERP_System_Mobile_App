import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyTeam } from '../api/team';
import { STATUS } from '../constants/attendanceStatus';
import { colors } from '../theme';

// Statuses a manager can act on by proxy: not checked in yet, or checked in but not out.
const ACTIONABLE = { A: 'checkin', NC: 'checkout' };

export default function TeamMembersScreen({ navigation, route }) {
  const { projectId, projectName } = route.params;
  const [members, setMembers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState({}); // { [empid]: true }

  const fetchTeam = useCallback(async () => {
    try {
      const { data } = await getMyTeam();
      const group = (data || []).find((g) => g.projectId === projectId);
      setMembers(group ? group.members : []);
    } catch {
      Alert.alert('Error', 'Could not load this project’s team. Pull down to try again.');
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      setSelected({});
      fetchTeam().finally(() => setPageLoading(false));
    }, [fetchTeam]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTeam();
    setRefreshing(false);
  };

  const toggleSelect = (empid) => {
    setSelected((prev) => ({ ...prev, [empid]: !prev[empid] }));
  };

  const openCamera = (mode, queue) => {
    navigation.navigate('Camera', { mode, proxy: true, queue });
  };

  const handleRowPress = (member) => {
    const action = ACTIONABLE[member.status];
    if (!action) return;
    openCamera(action, [{ empid: member.empid, name: member.name, projectId }]);
  };

  const handleBulkCheckIn = () => {
    const queue = members
      .filter((m) => selected[m.empid] && m.status === 'A')
      .map((m) => ({ empid: m.empid, name: m.name, projectId }));
    if (queue.length === 0) return;
    openCamera('checkin', queue);
  };

  const selectableCount = members.filter((m) => selected[m.empid] && m.status === 'A').length;

  if (pageLoading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{projectName}</Text>
          <Text style={styles.subtitle}>{members.length} team member{members.length === 1 ? '' : 's'}</Text>
        </View>
        {selectableCount > 0 && (
          <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkCheckIn}>
            <Text style={styles.bulkBtnText}>Check In ({selectableCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {members.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={styles.emptyText}>No employees assigned to this project yet.</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.empid)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
          renderItem={({ item }) => {
            const cfg = STATUS[item.status] ?? STATUS.A;
            const action = ACTIONABLE[item.status];
            const isSelected = !!selected[item.empid];
            return (
              <View style={styles.row}>
                {item.status === 'A' && (
                  <TouchableOpacity
                    style={[styles.checkbox, isSelected && styles.checkboxChecked]}
                    onPress={() => toggleSelect(item.empid)}
                  >
                    {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.rowMain}
                  activeOpacity={action ? 0.7 : 1}
                  onPress={() => handleRowPress(item)}
                  disabled={!action}
                >
                  <View>
                    <Text style={styles.rowName}>{item.name}</Text>
                    {!!item.jobTitle && <Text style={styles.rowJob}>{item.jobTitle}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 26, color: colors.text, fontWeight: '400' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  bulkBtn: { backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  bulkBtnText: { color: colors.accentText, fontSize: 12, fontWeight: '700' },

  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowJob: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxTick: { color: colors.accentText, fontSize: 13, fontWeight: '800' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
