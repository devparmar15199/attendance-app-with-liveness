import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { CameraView, BarcodeScanningResult, useCameraPermissions, BarcodeType } from 'expo-camera';
import * as Location from 'expo-location';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { qr } from '../services/api';
import { TabParamList, RootStackParamList } from '../types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Scan'>,
  NativeStackScreenProps<RootStackParamList>
>;

type PermissionStatus = 'checking' | 'granted' | 'denied';
type ScanStatus = 'scanning' | 'loading' | 'error';

const QR_FRAME_SIZE = 250;

const ScanScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const isFocused = useIsFocused();

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning');
  const [statusMessage, setStatusMessage] = useState('');

  const isScanning = useRef(false);
  const scanAnimation = useRef(new Animated.Value(0)).current;

  const startAnimation = () => {
    scanAnimation.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const checkPermissions = useCallback(async () => {
    // Check both location and camera permissions
    // Get camera status from hook, fetch location status
    const locationStatus = await Location.getForegroundPermissionsAsync();

    if (cameraPermission?.granted && locationStatus.granted) {
      setPermissionStatus('granted');
    } else {
      setPermissionStatus('denied');
    }
  }, [cameraPermission]);

  useFocusEffect(
    useCallback(() => {
      // Reset scan status when screen is focused
      setScanStatus('scanning');
      setStatusMessage('');
      isScanning.current = false;

      checkPermissions();

      if (permissionStatus === 'granted') {
        startAnimation();
      }
      // Re-run animation if permission is granted while focused
    }, [checkPermissions, permissionStatus])
  );

  const requestPermissions = async () => {
    await requestCameraPermission();
    await Location.requestForegroundPermissionsAsync();
    checkPermissions(); // Re-check after requests
  };

  const handleBarCodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (isScanning.current) return;
      isScanning.current = true; // Set lock

      setScanStatus('loading');
      setStatusMessage('Verifying QR Code...');

      try {
        let qrData;
        try {
          qrData = JSON.parse(data);
        } catch (parseError) {
          throw new Error('Invalid QR Code. Not valid JSON.');
        }

        if (!qrData.token) throw new Error('QR code missing required token');

        const validateResponse = await qr.validate({ token: qrData.token });
        if (!validateResponse.valid) {
          throw new Error(validateResponse.message || 'Invalid or expired QR code.');
        }

        const { classId } = validateResponse;
        const scheduleId = qrData.scheduleId;

        // Navigate to enhanced face verification (no longer needs AWS session ID)
        navigation.navigate('FaceLiveness', { classId, scheduleId });
      } catch (err: any) {
        console.error('QR scan error:', err);
        setScanStatus('error');
        setStatusMessage(err.message || 'An unknown error occurred.');
      }
    }, [navigation]);

  const animatedStyle = {
    transform: [
      {
        translateY: scanAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, QR_FRAME_SIZE],
        }),
      },
    ],
  };

  const renderContent = () => {
    if (permissionStatus === 'checking') {
      return (
        <View style={styles.fullScreenCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <View style={styles.fullScreenCenter}>
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={60}
            color={colors.error}
          />
          <Text
            variant="headlineSmall"
            style={[styles.permissionTitle, { color: colors.onSurface }]}
          >
            Permissions Required
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.permissionText, { color: colors.onSurfaceVariant }]}
          >
            This app needs access to your camera and location to verify
            attendance.
          </Text>
          <Button
            mode="contained"
            onPress={requestPermissions}
            style={styles.permissionButton}
          >
            Grant Permissions
          </Button>
        </View>
      );
    }

    return (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          active={
            isFocused && permissionStatus === 'granted' && scanStatus === 'scanning'
          }
          onBarcodeScanned={
            scanStatus === 'scanning' ? handleBarCodeScanned : undefined
          }
          barcodeScannerSettings={{
            barcodeTypes: ['qr'] as BarcodeType[],
          }}
        />

        {/* --- UPDATED: New centered overlay layout --- */}
        <View style={styles.overlay}>
          {/* Top dark section */}
          <View style={styles.overlayTop}>
            <Text style={styles.hintText}>
              Align QR code within the frame
            </Text>
          </View>

          {/* Middle row (transparent sides, centered frame) */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={[styles.qrFrame, { borderColor: 'white' }]}>
              {scanStatus === 'scanning' && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { backgroundColor: colors.primary },
                    animatedStyle,
                  ]}
                />
              )}
              {scanStatus !== 'scanning' && (
                <View style={styles.statusContainer}>
                  {scanStatus === 'loading' && (
                    <ActivityIndicator size="large" color="white" />
                  )}
                  {scanStatus === 'error' && (
                    <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={80}
                      color={colors.error}
                    />
                  )}
                  <Text style={[styles.statusText, { color: 'white' }]}>
                    {statusMessage}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Bottom dark section */}
          <View style={styles.overlayBottom}>
            {scanStatus !== 'scanning' && (
              <Button
                icon="camera-retake-outline"
                mode="contained"
                onPress={() => {
                  setScanStatus('scanning');
                  setStatusMessage('');
                  isScanning.current = false; // Reset lock
                  startAnimation();
                }}
              >
                Scan Again
              </Button>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    width: '100%',
  },
  permissionTitle: {
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    width: '80%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  hintText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  overlayMiddle: {
    height: QR_FRAME_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  qrFrame: {
    width: QR_FRAME_SIZE,
    height: QR_FRAME_SIZE,
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  scanLine: {
    width: '100%',
    height: 3,
    elevation: 2,
    position: 'absolute',
    top: -2, // Start just above the frame
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: '100%',
    height: '100%',
  },
  statusText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ScanScreen;