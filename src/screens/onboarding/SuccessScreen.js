import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { markOnboardingComplete } from '../../api/onboarding';
import { colors } from '../../theme';

export default function SuccessScreen() {
  const { completeOnboarding } = useAuth();
  const [confirming, setConfirming] = useState(true);

  // Auto-call the backend to mark onboarding complete as soon as screen mounts
  useEffect(() => {
    (async () => {
      try {
        await markOnboardingComplete();
      } catch {
        // Best-effort — completeOnboarding() below still updates local state
      } finally {
        setConfirming(false);
      }
    })();
  }, []);

  const handleEnterApp = () => {
    completeOnboarding(); // flips onboarding_complete in AuthContext → AppNavigator switches to MainTabs
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.heading}>You're All Set!</Text>
        <Text style={styles.sub}>
          Your face has been registered and verified. You can now check in to attendance
          by taking a selfie on every working day.
        </Text>

        {/* What's unlocked */}
        <View style={styles.unlockedCard}>
          <Text style={styles.unlockedTitle}>What's now unlocked</Text>
          {[
            '📱  Daily face-verified check-in',
            '🗓  Attendance history',
            '📄  Leave management',
            '💰  Salary & payslips',
            '🖥  Web app dashboard',
          ].map((item) => (
            <View key={item} style={styles.unlockedRow}>
              <Text style={styles.unlockedItem}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {confirming ? (
          <View style={styles.confirmingRow}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.confirmingText}>Saving your registration…</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleEnterApp}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Enter App →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 48 },

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 32, color: '#fff', fontWeight: '700' },

  heading: {
    fontSize: 26, fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginBottom: 10,
  },
  sub: {
    fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 32,
  },

  unlockedCard: {
    backgroundColor: colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 18,
  },
  unlockedTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  unlockedRow: { paddingVertical: 6 },
  unlockedItem: { fontSize: 14, color: colors.text, fontWeight: '500' },

  footer: { paddingHorizontal: 28, paddingBottom: 16 },
  primaryBtn: {
    backgroundColor: colors.green, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  confirmingRow: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  confirmingText: { fontSize: 14, color: colors.textSecondary },
});
