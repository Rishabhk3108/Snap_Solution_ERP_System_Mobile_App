import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { checkInWithFace, getCheckinStatus } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { getTodayDate, getCurrentTime, getYearMonth } from '../utils/dateTime';

const POLL_INTERVAL_MS = 5000;   // check status every 5 seconds
const MAX_POLL_ATTEMPTS = 72;    // 72 × 5s = 6 minutes before giving up

export default function CameraScreen({ navigation }) {
  const { user, projectId } = useAuth();
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const cameraRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const pollAttemptsRef = useRef(0);

  // Request location permission in the background while camera opens
  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
    return () => stopPolling(); // clean up if user navigates away
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (jobId) => {
    pollAttemptsRef.current = 0;
    setVerifyMessage('Verifying your identity...');

    pollIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;

      // Update the elapsed-time message
      const elapsed = pollAttemptsRef.current * (POLL_INTERVAL_MS / 1000);
      if (elapsed >= 30 && elapsed < 60) {
        setVerifyMessage('Still checking — almost there...');
      } else if (elapsed >= 60) {
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        setVerifyMessage(`Verifying... ${m}m ${s}s elapsed`);
      }

      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setSubmitting(false);
        setVerifyMessage('');
        Alert.alert(
          'Verification Timeout',
          'Face verification is taking too long. Please try again.',
        );
        return;
      }

      try {
        const { data } = await getCheckinStatus(jobId);
        if (data.status === 'success') {
          stopPolling();
          navigation.replace('Home');
        } else if (data.status === 'error') {
          stopPolling();
          setSubmitting(false);
          setVerifyMessage('');
          Alert.alert(
            'Check In Failed',
            data.message || 'Face verification failed. Please try again.',
          );
        }
        // status === 'processing' → keep polling
      } catch {
        // 404 means server restarted and job was lost; network error also lands here
        stopPolling();
        setSubmitting(false);
        setVerifyMessage('');
        Alert.alert('Check In Failed', 'Server connection lost. Please try again.');
      }
    }, POLL_INTERVAL_MS);
  };

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
    setVerifyMessage('Submitting photo...');
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
      const response = await checkInWithFace(
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

      const jobId = response?.data?.jobId;
      if (jobId) {
        // Face verification running in background — poll until done
        startPolling(jobId);
      } else {
        // No face image was used — direct check-in succeeded
        navigation.replace('Home');
      }
    } catch (err) {
      setSubmitting(false);
      setVerifyMessage('');
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Could not submit check-in. Please try again.';
      Alert.alert('Check In Failed', msg);
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
          {submitting ? (
            <View style={styles.verifyingBox}>
              <ActivityIndicator color="#4F8EF7" size="large" />
              <Text style={styles.verifyingText}>{verifyMessage}</Text>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  stopPolling();
                  setSubmitting(false);
                  setVerifyMessage('');
                }}
              >
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSubmit}
                activeOpacity={0.87}
              >
                <Text style={styles.primaryBtnText}>Submit & Check In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => setPhoto(null)}
              >
                <Text style={styles.ghostBtnText}>Retake</Text>
              </TouchableOpacity>
            </>
          )}
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

  // Verifying state
  verifyingBox: { alignItems: 'center', paddingVertical: 12, width: '100%', gap: 12 },
  verifyingText: { fontSize: 14, color: '#4A6080', textAlign: 'center' },
});
