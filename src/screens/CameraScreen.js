import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { compareFace } from '../api/face';
import { checkIn, checkOut } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { getTodayDate, getCurrentTime, getYearMonth } from '../utils/dateTime';

export default function CameraScreen({ navigation, route }) {
  const mode = route?.params?.mode ?? 'checkin'; // 'checkin' | 'checkout'
  const { user, projectId } = useAuth();
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const cameraRef = useRef(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhoto(result.uri);
    } catch {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatusMessage('Verifying your identity...');

    try {
      // Resize selfie before upload to reduce transfer size
      const compressed = await ImageManipulator.manipulateAsync(
        photo,
        [{ resize: { width: 640 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      // Face comparison against registration photo (server uses OpenCV, ~200ms)
      const { data: faceResult } = await compareFace(user.id, compressed.uri);

      if (!faceResult.match) {
        Alert.alert(
          'Face Not Recognized',
          faceResult.message || 'Your face did not match. Please try again in better lighting.',
        );
        setSubmitting(false);
        setStatusMessage('');
        setPhoto(null); // let them retake
        return;
      }

      // Face matched — mark attendance
      setStatusMessage(mode === 'checkin' ? 'Marking check-in...' : 'Marking check-out...');

      let locationStr = 'Unknown';
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        locationStr = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
      } catch {}

      if (mode === 'checkin') {
        const { year, month } = getYearMonth();
        await checkIn({
          empid: user.id,
          projectId,
          date: getTodayDate(),
          startTime: getCurrentTime(),
          location: locationStr,
          year,
          month,
        });
      } else {
        await checkOut({
          empid: user.id,
          date: getTodayDate(),
          endTime: getCurrentTime(),
        });
      }

      navigation.replace('Home');
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Something went wrong. Please try again.';
      Alert.alert(mode === 'checkin' ? 'Check In Failed' : 'Check Out Failed', msg);
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  if (!camPermission) return <View style={styles.dark} />;

  if (!camPermission.granted) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permBody}>Your photo is needed to verify your identity.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestCamPermission}>
          <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (photo) {
    return (
      <View style={styles.dark}>
        <Image source={{ uri: photo }} style={styles.previewImg} resizeMode="cover" />
        <SafeAreaView edges={['bottom']} style={styles.previewFooter}>
          <Text style={styles.previewTitle}>
            {mode === 'checkin' ? 'Check In Photo' : 'Check Out Photo'}
          </Text>
          <Text style={styles.previewSub}>
            Your face will be matched against your registered photo.
          </Text>

          {submitting ? (
            <View style={styles.verifyingBox}>
              <ActivityIndicator color="#4F8EF7" size="large" />
              <Text style={styles.verifyingText}>{statusMessage}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} activeOpacity={0.87}>
                <Text style={styles.primaryBtnText}>
                  {mode === 'checkin' ? 'Verify & Check In' : 'Verify & Check Out'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setPhoto(null)}>
                <Text style={styles.ghostBtnText}>Retake</Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.dark}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>
            {mode === 'checkin' ? 'Check In — Take Selfie' : 'Check Out — Take Selfie'}
          </Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        <View style={styles.ovalWrap} pointerEvents="none">
          <View style={styles.ovalGuide} />
          <Text style={styles.ovalHint}>Centre your face</Text>
        </View>

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

  permTitle: { fontSize: 20, fontWeight: '700', color: '#EDF2F7', marginBottom: 10, textAlign: 'center' },
  permBody: { fontSize: 14, color: '#4A6080', textAlign: 'center', marginBottom: 32, lineHeight: 22 },

  primaryBtn: {
    backgroundColor: '#4F8EF7', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40,
    alignItems: 'center', width: '100%',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn: { paddingVertical: 12, alignItems: 'center', width: '100%', marginTop: 4 },
  ghostBtnText: { color: '#4A6080', fontSize: 15 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  closeIcon: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },

  ovalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ovalGuide: {
    width: 210, height: 280, borderRadius: 105,
    borderWidth: 2, borderColor: 'rgba(79,142,247,0.75)',
  },
  ovalHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 14, fontWeight: '500' },

  bottomBar: { alignItems: 'center', paddingBottom: 24 },
  captureRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  captureDisk: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  previewImg: { flex: 1 },
  previewFooter: {
    backgroundColor: '#0B1120', paddingHorizontal: 28,
    paddingTop: 20, paddingBottom: 12, alignItems: 'center', gap: 8,
  },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#EDF2F7' },
  previewSub: { fontSize: 13, color: '#4A6080', textAlign: 'center', marginBottom: 6 },

  verifyingBox: { alignItems: 'center', paddingVertical: 12, width: '100%', gap: 10 },
  verifyingText: { fontSize: 14, color: '#4A6080', textAlign: 'center' },
});
