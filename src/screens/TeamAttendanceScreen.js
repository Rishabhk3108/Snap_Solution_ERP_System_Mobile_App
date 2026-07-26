import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyTeam } from '../api/team';
import { colors } from '../theme';

export default function TeamAttendanceScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const { data } = await getMyTeam();
      setProjects(data || []);
    } catch {
      Alert.alert('Error', 'Could not load your projects. Pull down to try again.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTeam().finally(() => setPageLoading(false));
    }, [fetchTeam]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTeam();
    setRefreshing(false);
  };

  const openProject = (group) => {
    navigation.navigate('TeamMembers', { projectId: group.projectId, projectName: group.projectName });
  };

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
        <Text style={styles.title}>My Team</Text>
        <Text style={styles.subtitle}>Select a project to manage its team's attendance</Text>
      </View>

      {projects.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={styles.emptyText}>No team members assigned to your project yet.</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.projectId)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
          renderItem={({ item }) => {
            const total = item.members.length;
            const notCheckedIn = item.members.filter((m) => m.status === 'A').length;
            const checkedIn = item.members.filter((m) => m.status === 'NC').length;
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openProject(item)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.projectName}</Text>
                  <Text style={styles.cardChevron}>›</Text>
                </View>
                <Text style={styles.cardSub}>{total} team member{total === 1 ? '' : 's'}</Text>
                <View style={styles.statsRow}>
                  {notCheckedIn > 0 && (
                    <View style={styles.statPill}>
                      <View style={[styles.statDot, { backgroundColor: '#D1D5DB' }]} />
                      <Text style={styles.statText}>{notCheckedIn} not checked in</Text>
                    </View>
                  )}
                  {checkedIn > 0 && (
                    <View style={styles.statPill}>
                      <View style={[styles.statDot, { backgroundColor: colors.green }]} />
                      <Text style={styles.statText}>{checkedIn} checked in</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },

  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  card: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, paddingVertical: 16, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardChevron: { fontSize: 22, color: colors.textTertiary, fontWeight: '300' },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});
