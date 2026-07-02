import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function LeaveScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Leave</Text>
        <Text style={styles.pageSub}>Manage your leave requests</Text>
        <View style={styles.card}>
          <Text style={styles.soon}>Coming Soon</Text>
          <Text style={styles.soonSub}>
            Leave requests and balance tracking will be available here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 2 },
  pageSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 24 },
  card: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, padding: 32, alignItems: 'center',
  },
  soon: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10 },
  soonSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
