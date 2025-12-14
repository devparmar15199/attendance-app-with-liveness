import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated, Vibration, Platform } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { CompositeScreenProps, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { qr } from '../services/api';
import { TabParamList, RootStackParamList } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Scan'>,
  NativeStackScreenProps<RootStackParamList>
>;

type PermissionStatus = 'checking' | 'granted' | 'denied';
type ScanStatus = 'scanning' | 'processing' | 'success' | 'error';

const QR_FRAME_SIZE = 260;

const ScanScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // State
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning');
  const [errorMessage, setErrorMessage] = useState('');

  // Explicitly control camera mounting
  const [cameraActive, setCameraActive] = useState(true);

  const isProcessingRef = useRef(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Animation Logic
  const startScanAnimation = () => {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 0,  // Reset instantly
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopScanAnimation = () => {
    scanAnim.stopAnimation();
    scanAnim.setValue(0);
  };

  // Permissions
  const checkPermissions = useCallback(async () => {
    const locStatus = await Location.getForegroundPermissionsAsync();

    if (cameraPermission?.granted && locStatus.granted) {
      setPermissionStatus('granted');
    } else {
      setPermissionStatus('denied');
    }
  }, [cameraPermission]);

  const requestPermissions = async () => {
    await requestCameraPermission();
    await Location.requestForegroundPermissionsAsync();
    checkPermissions();
  };

  // Lifecycle management
  useFocusEffect(
    useCallback(() => {
      // Reset state when screen comes into focus
      setScanStatus('scanning');
      setErrorMessage('');
      setCameraActive(true);
      isProcessingRef.current = false;

      checkPermissions();

      // Start animation if we are ready
      if (permissionStatus === 'granted') {
        startScanAnimation();
      }

      return () => stopScanAnimation();
    }, [checkPermissions, permissionStatus])
  );

  // Scanning Logic
  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    // 1. Immediate Lock to prevent multiple triggers
    if (isProcessingRef.current || scanStatus !== 'scanning') return;
    isProcessingRef.current = true; // Set lock

    // 2. UX Feedback
    Vibration.vibrate();
    setScanStatus('processing');
    stopScanAnimation();

    try {
      // 3. Parse QR Data
      let qrPayload;
      try {
        qrPayload = JSON.parse(data);
      } catch (parseError) {
        throw new Error('Invalid QR Format.');
      }

      if (!qrPayload.token) throw new Error('Invalid Class Token.');

      // 4. Parallel Execution: Validate Token AND Get Location
      // We wrap location in a promise that rejects after 5 seconds to prevent hanging
      // const locationPromise = Promise.race([
      //   Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      //   new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 5000))
      // ]);

      const validatePromise = qr.validate({ token: qrPayload.token });

      const [validateResponse]: [any] = await Promise.all([
        // locationPromise,
        validatePromise
      ]);

      if (!validateResponse.valid) {
        throw new Error(validateResponse.message || 'Session expired or invalid.');
      }

      // 5. Success - Navigate
      setScanStatus('success');

      setCameraActive(false);

      setTimeout(() => {
        navigation.navigate('FaceLiveness', {
          classId: validateResponse.classId,
          scheduleId: qrPayload.scheduleId,
        });
      }, 100);
    } catch (err: any) {
      console.error('Scan Error:', err);
      setScanStatus('error');
      setErrorMessage(err.message || 'Failed to verify QR code.');
      isProcessingRef.current = false; // Allow retry
    }
  };

  const handleRetry = () => {
    setScanStatus('scanning');
    setErrorMessage('');
    isProcessingRef.current = false;
    startScanAnimation();
  };

  // --- Render Helpers ---

  const renderOverlay = () => (
    <View style={styles.overlay}>
      {/* Top Dimmed Area */}
      <View style={styles.dimmed} />

      {/* Middle Area with Frame */}
      <View style={styles.middleRow}>
        <View style={styles.dimmed} />

        {/* The Scan Frame */}
        <View style={[styles.scanFrame, { borderColor: getFrameColor() }]}>

          {/* Corner Markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Animated Line (Only when scanning) */}
          {scanStatus === 'scanning' && (
            <Animated.View
              style={[
                styles.laserLine,
                {
                  backgroundColor: colors.primary,
                  transform: [{
                    translateY: scanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, QR_FRAME_SIZE],
                    }),
                  }],
                },
              ]}
            />
          )}

          {/* Loading Indicator */}
          {scanStatus === 'processing' && (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.feedbackText}>Verifying...</Text>
            </View>
          )}

          {/* Error Indicator */}
          {scanStatus === 'error' && (
            <View style={[styles.feedbackContainer, { backgroundColor: 'rgba(186, 26, 26, 0.9)' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#fff" />
              <Text style={styles.feedbackText}>Scan Failed</Text>
            </View>
          )}
        </View>

        <View style={styles.dimmed} />
      </View>

      {/* Bottom Dimmed Area */}
      <View style={styles.dimmed}>
        <Text style={styles.hintText}>
          {scanStatus === 'error' ? errorMessage : "Align QR code within the frame"}
        </Text>

        {scanStatus === 'error' && (
          <Button
            mode="contained"
            onPress={handleRetry}
            icon="refresh"
            style={{ marginTop: 20 }}
            buttonColor={colors.error}
          >
            Try Again
          </Button>
        )}
      </View>
    </View>
  );

  const getFrameColor = () => {
    if (scanStatus === 'success') return '#4CAF50';
    if (scanStatus === 'error') return colors.error;
    return '#fff';
  };

  // --- Main Render ---

  if (permissionStatus === 'checking') {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 30 }]}>
        <MaterialCommunityIcons name="camera-off" size={64} color={colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 20, fontWeight: 'bold' }}>Permission Required</Text>
        <Text style={{ textAlign: 'center', marginVertical: 10, color: colors.onSurfaceVariant }}>
          We need access to your Camera and Location to mark attendance securely.
        </Text>
        <Button mode="contained" onPress={requestPermissions} style={{ marginTop: 20 }}>
          Grant Access
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && cameraActive && permissionStatus === 'granted' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          // OPTIMIZATION: Do not unmount camera, just stop listening to events
          onBarcodeScanned={scanStatus === 'scanning' ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'], // Optimize: only look for QRs
          }}
        />
      )}
      {renderOverlay()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject },
  dimmed: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  middleRow: { flexDirection: 'row', height: QR_FRAME_SIZE },
  
  scanFrame: {
    width: QR_FRAME_SIZE,
    height: QR_FRAME_SIZE,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 20,
  },
  
  // Fancy Corners
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#fff', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  laserLine: {
    width: '100%',
    height: 3,
    opacity: 0.8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },

  feedbackContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  feedbackText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 18,
  },
  hintText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default ScanScreen;