import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { verifyFaceTest } from '../../api/onboarding';
import { colors } from '../../theme';

export default function FaceTestScreen({ navigation }) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhoto(result.uri);
    } catch {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      await verifyFaceTest(user.id, photo);
      // match — go to success
      navigation.navigate('OB_Success');
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        Alert.alert(
          'Face Not Recognised',
          'The selfie did not match your registered face. Make sure the lighting is good and your face is fully visible, then try again.',
          [{ text: 'Try Again', onPress: () => setPhoto(null) }],
        );
      } else {
        const msg = err.response?.data?.detail || 'Verification failed. Please try again.';
        Alert.alert('Error', msg);
        setPhoto(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (photo) {
    return (
      <View style={styles.dark}>
        <Image source={{ uri: photo }} style={styles.previewImg} resizeMode="cover" />
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 3 of 3 — Verification Test</Text>
          </View>
          <Text style={styles.footerTitle}>Verify this selfie?</Text>
          <Text style={styles.footerSub}>
            We'll compare this with your registered face to confirm it works.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.disabled]}
            onPress={handleVerify}
            disabled={submitting}
            activeOpacity={0.87}
          >
            {submitting
              ? <ActivityIndicator color="#1f1f1f" />
              : <Text style={styles.primaryBtnText}>Run Face Test →</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setPhoto(null)} disabled={submitting}>
            <Text style={styles.ghostBtnText}>Retake</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.dark}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <View style={styles.stepBadgeTop}>
            <Text style={styles.stepBadgeText}>Step 3 of 3 — Verification Test</Text>
          </View>
        </SafeAreaView>

        <View style={styles.ovalWrap} pointerEvents="none">
          <View style={styles.ovalGuide} />
          <Text style={styles.ovalHint}>Take a fresh selfie to test your face scan</Text>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Text style={styles.instruction}>
            This confirms your face enrolment is working correctly.
          </Text>
          <TouchableOpacity style={styles.captureRing} onPress={takePicture} activeOpacity={0.8}>
            <View style={styles.captureDisk} />
          </TouchableOpacity>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  camera: { flex: 1 },

  permTitle: { fontSize: 20, fontWeight: '700', color: '#EDF2F7', marginBottom: 10, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', width: '100%',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#1f1f1f' },
  ghostBtn: { paddingVertical: 12, alignItems: 'center', width: '100%', marginTop: 4 },
  ghostBtnText: { color: '#4A6080', fontSize: 15 },
  disabled: { opacity: 0.5 },

  topBar: { alignItems: 'center', paddingTop: 12 },
  stepBadgeTop: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  stepBadge: {
    backgroundColor: 'rgba(244,180,0,0.15)',
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6,
    alignSelf: 'center', marginBottom: 14,
  },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: colors.accent },

  ovalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ovalGuide: {
    width: 210, height: 280, borderRadius: 105,
    borderWidth: 2, borderColor: `${colors.accent}bb`,
  },
  ovalHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },

  bottomBar: { alignItems: 'center', paddingBottom: 20, paddingHorizontal: 28, gap: 16 },
  instruction: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  captureRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  captureDisk: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  previewImg: { flex: 1 },
  footer: {
    backgroundColor: '#0B1120', paddingHorizontal: 28,
    paddingTop: 20, paddingBottom: 12, alignItems: 'center', gap: 8,
  },
  footerTitle: { fontSize: 18, fontWeight: '700', color: '#EDF2F7' },
  footerSub: { fontSize: 13, color: '#4A6080', textAlign: 'center', marginBottom: 6 },
});
