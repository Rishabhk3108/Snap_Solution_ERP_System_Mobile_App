import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { updatePersonalInfo } from '../../api/onboarding';
import { colors } from '../../theme';

const GENDERS = ['Male', 'Female', 'Other'];

function StepIndicator({ current }) {
  return (
    <View style={ind.row}>
      {[1, 2, 3].map((n) => (
        <React.Fragment key={n}>
          <View style={[ind.dot, n === current && ind.dotActive, n < current && ind.dotDone]}>
            {n < current
              ? <Text style={ind.checkmark}>✓</Text>
              : <Text style={[ind.dotText, n === current && ind.dotTextActive]}>{n}</Text>}
          </View>
          {n < 3 && <View style={[ind.line, n < current && ind.lineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const ind = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.accent },
  dotDone: { backgroundColor: colors.green },
  dotText: { fontSize: 13, fontWeight: '700', color: colors.textTertiary },
  dotTextActive: { color: '#1f1f1f' },
  checkmark: { fontSize: 14, color: '#fff', fontWeight: '700' },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  lineDone: { backgroundColor: colors.green },
});

export default function PersonalDetailsScreen({ navigation }) {
  const { user } = useAuth();

  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!mobile.trim()) {
      Alert.alert('Mobile Required', 'Please enter your mobile number.');
      return;
    }
    if (!nomineeName.trim()) {
      Alert.alert('Nominee Required', 'Please enter the nominee name.');
      return;
    }
    if (!nomineeRelationship.trim()) {
      Alert.alert('Nominee Required', 'Please enter your relationship with the nominee.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePersonalInfo(user.id, {
        dateOfBirth: dob || undefined,
        gender: gender || undefined,
        mobile: mobile.trim(),
        emailAddress: email.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        nomineeName: nomineeName.trim(),
        nomineeRelationship: nomineeRelationship.trim(),
      });
      navigation.navigate('OB_FaceEnroll');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <StepIndicator current={1} />

          <Text style={styles.heading}>Personal Details</Text>
          <Text style={styles.sub}>This information helps HR manage your profile.</Text>

          {/* Date of Birth */}
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={dob}
            onChangeText={setDob}
            keyboardType="numeric"
          />

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mobile */}
          <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.textTertiary}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />

          {/* Email */}
          <Text style={styles.label}>Personal Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* City */}
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Mumbai"
            placeholderTextColor={colors.textTertiary}
            value={city}
            onChangeText={setCity}
          />

          {/* State */}
          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            placeholder="Maharashtra"
            placeholderTextColor={colors.textTertiary}
            value={state}
            onChangeText={setState}
          />

          {/* Nominee Name */}
          <Text style={styles.label}>Nominee Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Full name of nominee"
            placeholderTextColor={colors.textTertiary}
            value={nomineeName}
            onChangeText={setNomineeName}
          />

          {/* Nominee Relationship */}
          <Text style={styles.label}>Relationship with Nominee <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Spouse, Father, Mother"
            placeholderTextColor={colors.textTertiary}
            value={nomineeRelationship}
            onChangeText={setNomineeRelationship}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.disabled]}
            onPress={handleContinue}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#1f1f1f" />
              : <Text style={styles.primaryBtnText}>Continue →</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },

  heading: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 },

  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { color: colors.red },
  input: {
    backgroundColor: colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text, marginBottom: 18,
  },

  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  genderBtnTextActive: { color: '#1f1f1f' },

  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#1f1f1f' },
  disabled: { opacity: 0.6 },
});
