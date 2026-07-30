import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getPersonalInfo } from '../../api/onboarding';
import { colors } from '../../theme';

// Face enrollment/test steps are temporarily disabled — restore the line below when re-enabling.
// const STEPS = ['Personal Details', 'Face Enrolment', 'Face Test'];
const STEPS = ['Personal Details'];

export default function WelcomeScreen({ navigation }) {
  const { user } = useAuth();
  const firstName = user?.fullname?.split(' ')[0] || 'there';
  const [checking, setChecking] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      {/* Top accent bar */}
      <View style={styles.accentBar} />

      <View style={styles.body}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>⚡</Text>
        </View>

        {/* Greeting */}
        <Text style={styles.heading}>Welcome, {firstName}!</Text>
        <Text style={styles.sub}>
          Your account has been approved. Complete a quick setup before
          you can access Snap Solutions.
        </Text>

        {/* Step cards */}
        <View style={styles.stepList}>
          {STEPS.map((label, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{label}</Text>
              {i === 0 && (
                <View style={styles.nextPill}>
                  <Text style={styles.nextPillText}>Next</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Approved badge */}
        <View style={styles.approvedBadge}>
          <Text style={styles.approvedDot}>●</Text>
          <Text style={styles.approvedText}>Account approved and active</Text>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, checking && styles.disabled]}
          onPress={async () => {
            setChecking(true);
            try {
              const { data } = await getPersonalInfo(user.id);
              // If admin already filled mobile, skip personal details step
              if (data?.mobile) {
                // navigation.navigate('OB_FaceEnroll'); // face enrollment temporarily disabled
                navigation.navigate('OB_Success');
              } else {
                navigation.navigate('OB_PersonalDetails');
              }
            } catch {
              navigation.navigate('OB_PersonalDetails');
            } finally {
              setChecking(false);
            }
          }}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking
            ? <ActivityIndicator color="#1f1f1f" />
            : <Text style={styles.primaryBtnText}>Get Started →</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  accentBar: { height: 4, backgroundColor: colors.accent },

  body: { flex: 1, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 16 },

  iconWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 30 },

  heading: {
    fontSize: 26, fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginBottom: 10,
  },
  sub: {
    fontSize: 15, color: colors.textSecondary, lineHeight: 22,
    marginBottom: 32,
  },

  stepList: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: colors.separator,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  stepNumText: { fontSize: 13, fontWeight: '700', color: '#1f1f1f' },
  stepLabel: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  nextPill: {
    backgroundColor: 'rgba(244,180,0,0.15)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3,
  },
  nextPillText: { fontSize: 11, fontWeight: '700', color: colors.accent },

  approvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  approvedDot: { fontSize: 10, color: colors.green },
  approvedText: { fontSize: 13, color: colors.textSecondary },

  footer: {
    paddingHorizontal: 28, paddingBottom: 12,
  },
  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#1f1f1f' },
  disabled: { opacity: 0.6 },
});
