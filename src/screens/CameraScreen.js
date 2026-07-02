import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { checkInWithFace } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { getTodayDate, getCurrentTime, getYearMonth } from '../utils/dateTime';

export default function CameraScreen({ navigation }) {
  const { user, projectId } = useAuth();
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef(null);

  // Request location permission in the background while camera opens
  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      setPhoto(result.uri);
    } catch {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Capture GPS location (non-blocking — falls back to 'Unknown')
      let locationStr = 'Unknown';
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        locationStr = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
      } catch {
        // Location permission denied or unavailable — proceed anyway
      }

      const { year, month } = getYearMonth();
      await checkInWithFace(
        {
          empid: user.id,
          projectId,
          date: getTodayDate(),
          startTime: getCurrentTime(),
          location: locationStr,
          year,
          month,
        },
        photo,
      );

      navigation.replace('Home');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Check-in failed. Please try again.';
      Alert.alert('Check In Failed', msg);
      setSubmitting(false);
    }
  };

  // ── Permission not yet determined ──
  if (!camPermission) {
    return <View style={styles.dark} />;
  }

  // ── Permission denied ──
  if (!camPermission.granted) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permBody}>
          Your selfie is needed to confirm your identity at check-in.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestCamPermission}>
          <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Photo preview ──
  if (photo) {
    return (
      <View style={styles.dark}>
        <Image source={{ uri: photo }} style={styles.previewImg} resizeMode="cover" />
        <SafeAreaView edges={['bottom']} style={styles.previewFooter}>
          <Text style={styles.previewTitle}>Use this photo?</Text>
          <Text style={styles.previewSub}>
            Your location will be captured automatically on submit.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.disabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.87}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit & Check In</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => setPhoto(null)}
            disabled={submitting}
          >
            <Text style={styles.ghostBtnText}>Retake</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ── Live camera ──
  return (
    <View style={styles.dark}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Attendance Selfie</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        {/* Face guide oval */}
        <View style={styles.ovalWrap} pointerEvents="none">
          <View style={styles.ovalGuide} />
          <Text style={styles.ovalHint}>Centre your face</Text>
        </View>

        {/* Capture button */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
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

  // Permission screen
  permTitle: { fontSize: 20, fontWeight: '700', color: '#EDF2F7', marginBottom: 10, textAlign: 'center' },
  permBody: { fontSize: 14, color: '#4A6080', textAlign: 'center', marginBottom: 32, lineHeight: 22 },

  // Buttons
  primaryBtn: {
    backgroundColor: '#4F8EF7', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40,
    alignItems: 'center', width: '100%',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn: { paddingVertical: 12, alignItems: 'center', width: '100%', marginTop: 4 },
  ghostBtnText: { color: '#4A6080', fontSize: 15 },
  disabled: { opacity: 0.5 },

  // Camera overlays
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  closeIcon: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },

  ovalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ovalGuide: {
    width: 210, height: 280, borderRadius: 105,
    borderWidth: 2, borderColor: 'rgba(79,142,247,0.75)',
  },
  ovalHint: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    marginTop: 14, fontWeight: '500',
  },

  bottomBar: { alignItems: 'center', paddingBottom: 24 },
  captureRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  captureDisk: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  // Preview
  previewImg: { flex: 1 },
  previewFooter: {
    backgroundColor: '#0B1120', paddingHorizontal: 28,
    paddingTop: 20, paddingBottom: 12, alignItems: 'center', gap: 8,
  },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#EDF2F7' },
  previewSub: { fontSize: 13, color: '#4A6080', textAlign: 'center', marginBottom: 6 },
});
