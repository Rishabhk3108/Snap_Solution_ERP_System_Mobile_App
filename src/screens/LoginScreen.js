import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await login(username.trim(), password);
      await signIn(data.token, data.user);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo mark */}
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <Text style={styles.logoGlyph}>◎</Text>
            </View>
            <Text style={styles.brand}>Snap ERP</Text>
            <Text style={styles.sub}>Attendance</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor="#3A4A5E"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.passInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#3A4A5E"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 },

  logoWrap: { alignItems: 'center', marginBottom: 52 },
  logoMark: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#111E34',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#1E3A5F',
    marginBottom: 16,
  },
  logoGlyph: { fontSize: 38, color: '#4F8EF7' },
  brand: { fontSize: 26, fontWeight: '700', color: '#EDF2F7', letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#4F8EF7', fontWeight: '600', letterSpacing: 2, marginTop: 2 },

  form: {},
  label: {
    fontSize: 11, color: '#4A6080', fontWeight: '700',
    letterSpacing: 1.4, marginBottom: 8,
  },
  input: {
    backgroundColor: '#111E34', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, color: '#EDF2F7', fontSize: 15,
    borderWidth: 1, borderColor: '#1E3A5F', flex: 1,
  },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  passInput: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    backgroundColor: '#111E34', borderWidth: 1, borderLeftWidth: 0,
    borderColor: '#1E3A5F', borderTopRightRadius: 12, borderBottomRightRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  eyeIcon: { fontSize: 18 },

  btn: {
    marginTop: 32, backgroundColor: '#4F8EF7',
    borderRadius: 14, paddingVertical: 17, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
