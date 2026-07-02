import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const ROLE_LABELS = {
  ROLE_ADMIN: { label: 'Admin', color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
  ROLE_MANAGER: { label: 'Manager', color: '#2563eb', bg: 'rgba(59,130,246,0.08)' },
  ROLE_EMPLOYEE: { label: 'Employee', color: colors.amber, bg: colors.amberBg },
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const initial = user?.fullname?.charAt(0)?.toUpperCase() ?? '?';
  const role = ROLE_LABELS[user?.role] ?? ROLE_LABELS.ROLE_EMPLOYEE;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>
        <Text style={styles.pageSub}>Your account details</Text>

        {/* Avatar + name card */}
        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.fullname ?? '—'}</Text>
          <View style={[styles.rolePill, { backgroundColor: role.bg }]}>
            <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          {[
            { label: 'Username', value: user?.username ?? '—' },
            { label: 'Employee ID', value: user?.id ? `#${user.id}` : '—' },
            { label: 'Job Title', value: user?.jobTitle ?? '—' },
          ].map(({ label, value }, i, arr) => (
            <View key={label} style={[styles.detailRow, i < arr.length - 1 && styles.detailBorder]}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 2 },
  pageSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },

  card: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, marginBottom: 12, overflow: 'hidden',
  },
  avatarWrap: { alignItems: 'center', paddingTop: 28, paddingBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(244,180,0,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: colors.accent },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 10 },
  rolePill: {
    alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 6, marginBottom: 20,
  },
  roleText: { fontSize: 12, fontWeight: '700' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: colors.separator },
  detailLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '600' },

  signOutBtn: {
    backgroundColor: colors.redBg, borderRadius: 12, borderWidth: 1,
    borderColor: colors.redBorder, padding: 16, alignItems: 'center', marginTop: 4,
  },
  signOutText: { color: colors.red, fontSize: 15, fontWeight: '700' },
});
