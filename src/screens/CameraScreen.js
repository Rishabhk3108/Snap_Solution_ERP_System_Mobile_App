import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { compareFace } from '../api/face';
import { checkIn, checkOut } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { getTodayDate, getCurrentTime, getYearMonth } from '../utils/dateTime';

const SUBMIT_TIMEOUT_MS = 30_000;

export default function CameraScreen({ navigation, route }) {
  const mode = route?.params?.mode ?? 'checkin';
  const { user, projectId } = useAuth();
  const proxy = !!route?.params?.proxy;
  // Proxy mode: a manager stepping through one or more team members' check-in/out.
  // Self mode: the logged-in employee's own check-in/out, wrapped in the same one-item shape.
  const queue = proxy
    ? route?.params?.queue ?? []
    : [{ empid: user.id, name: user.fullname, projectId }];
  const [queueIndex, setQueueIndex] = useState(0);
  const target = queue[queueIndex];

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [facing, setFacing] = useState(proxy ? 'back' : 'front');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const cameraRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // Block Android hardware back button while a submission is in flight so the
  // user cannot accidentally navigate away mid-request (which would leave
  // attendance marked but the UI stuck on the old screen).
  useFocusEffect(
    useCallback(() => {
      const onBack = () => submitting;
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [submitting]),
  );

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
    if (submitting) return;
    setSubmitting(true);

    // Hard 30-second UI timeout — resets the screen and tells the user to retry.
    let timedOut = false;
    timeoutRef.current = setTimeout(() => {
      timedOut = true;
      setSubmitting(false);
      setStatusMessage('');
      setPhoto(null);
      Alert.alert(
        'Taking Too Long',
        'The request timed out after 30 s. Please check your internet connection and try again.',
      );
    }, SUBMIT_TIMEOUT_MS);

    const clearTimer = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    try {
      // Step 1 — compress
      setStatusMessage('Step 1/4  Compressing photo...');
      const compressed = await ImageManipulator.manipulateAsync(
        photo,
        [{ resize: { width: 640 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (timedOut) return;

      // Step 2 — face compare (server-side PIL histogram, ~1-2 s incl. network)
      setStatusMessage(proxy ? `Step 2/4  Verifying ${target.name}'s face...` : 'Step 2/4  Verifying your face...');
      const { data: faceResult } = await compareFace(target.empid, compressed.uri);
      if (timedOut) return;

      if (!faceResult.match) {
        clearTimer();
        Alert.alert(
          'Face Not Recognized',
          faceResult.message || (proxy
            ? `${target.name}'s face did not match. Please try again in better lighting.`
            : 'Your face did not match. Please try again in better lighting.'),
        );
        setSubmitting(false);
        setStatusMessage('');
        setPhoto(null);
        return;
      }

      // Step 3 — location (instant with cached GPS, max 5 s fallback)
      setStatusMessage('Step 3/4  Getting location...');
      let locationStr = 'Unknown';
      try {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (cached) {
          locationStr = `${cached.coords.latitude.toFixed(6)},${cached.coords.longitude.toFixed(6)}`;
        } else {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('loc_timeout')), 5000)),
          ]);
          locationStr = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
        }
      } catch {}
      if (timedOut) return;

      // Step 4 — record attendance
      setStatusMessage(mode === 'checkin' ? 'Step 4/4  Recording check-in...' : 'Step 4/4  Recording check-out...');
      if (mode === 'checkin') {
        const { year, month } = getYearMonth();
        await checkIn({
          empid: target.empid,
          projectId: target.projectId,
          date: getTodayDate(),
          startTime: getCurrentTime(),
          location: locationStr,
          year,
          month,
        });
      } else {
        await checkOut({
          empid: target.empid,
          date: getTodayDate(),
          endTime: getCurrentTime(),
        });
      }
      if (timedOut) return;

      clearTimer();

      if (proxy && queueIndex + 1 < queue.length) {
        // More team members queued — reset the capture UI and move to the next one.
        setQueueIndex((i) => i + 1);
        setSubmitting(false);
        setStatusMessage('');
        setPhoto(null);
      } else if (proxy) {
        navigation.goBack();
      } else {
        navigation.replace('Tabs', { screen: 'Home' });
      }
    } catch (err) {
      if (timedOut) return;
      clearTimer();
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      console.log('Submit error:', JSON.stringify(err?.response?.data), err?.message);
      Alert.alert(mode === 'checkin' ? 'Check In Failed' : 'Check Out Failed', msg);
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  if (proxy && queue.length === 0) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <Text style={styles.permTitle}>No One Selected</Text>
        <Text style={styles.permBody}>Select at least one team member before continuing.</Text>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
            {proxy
              ? `${mode === 'checkin' ? 'Check In' : 'Check Out'} — ${target.name}`
              : (mode === 'checkin' ? 'Check In Photo' : 'Check Out Photo')}
          </Text>
          <Text style={styles.previewSub}>
            {proxy
              ? `This photo will be matched against ${target.name}'s registered face.`
              : 'Your face will be matched against your registered photo.'}
          </Text>

          {submitting ? (
            <View style={styles.verifyingBox}>
              <ActivityIndicator color="#4F8EF7" size="large" />
              <Text style={styles.verifyingText}>{statusMessage}</Text>
              <Text style={styles.verifyingHint}>Please wait — do not press back</Text>
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
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.cameraTitle}>
              {proxy
                ? `${mode === 'checkin' ? 'Check In' : 'Check Out'} — ${target.name}`
                : (mode === 'checkin' ? 'Check In — Take Selfie' : 'Check Out — Take Selfie')}
            </Text>
            {proxy && queue.length > 1 && (
              <Text style={styles.cameraProgress}>{queueIndex + 1} of {queue.length}</Text>
            )}
          </View>
          {proxy ? (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            >
              <Text style={styles.closeIcon}>⟲</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </SafeAreaView>

        <View style={styles.ovalWrap} pointerEvents="none">
          <View style={styles.ovalGuide} />
          <Text style={styles.ovalHint}>
            {proxy ? `Centre ${target.name.split(' ')[0]}'s face` : 'Centre your face'}
          </Text>
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
  cameraTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  cameraProgress: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

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
  verifyingText: { fontSize: 15, color: '#EDF2F7', textAlign: 'center', fontWeight: '600' },
  verifyingHint: { fontSize: 12, color: '#4A6080', textAlign: 'center' },
});
