import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { Text, useTheme, Button, ProgressBar, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImageManipulator from 'expo-image-manipulator';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { attendance } from '../services/api';
import { RootStackParamList, LivenessChallenge } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FaceLiveness'>;

const { width: screenWidth } = Dimensions.get('window');
const OVAL_WIDTH = screenWidth * 0.7;
const OVAL_HEIGHT = screenWidth * 0.95;

// Consolidated state to prevent race conditions
type ScreenState = 
  | 'initializing' 
  | 'ready' 
  | 'countdown' 
  | 'capturing' 
  | 'submitting' 
  | 'success' 
  | 'error';

interface CapturedChallenge {
  challengeType: string;
  image: string;
}

const FaceLivenessScreen = ({ route, navigation }: Props) => {
  const { classId } = route.params;
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  
  // Refs
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current; // Opacity for instruction icons
  
  // Permissions
  const [permission, requestPermission] = useCameraPermissions();
  
  // State
  const [screenState, setScreenState] = useState<ScreenState>('initializing');
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [capturedData, setCapturedData] = useState<CapturedChallenge[]>([]);
  
  // UI State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [errorDetails, setErrorDetails] = useState('');

  // Camera lifecycle management
  const [mountCamera, setMountCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // --- Animation Helpers ---
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const flashOverlay = () => {
    overlayAnim.setValue(1);
    Animated.timing(overlayAnim, { toValue: 0, duration: 1500, useNativeDriver: true }).start();
  };

  // --- Initialization ---
  useEffect(() => {
    // FIX: Delay camera mounting to prevent resource conflict with ScanScreen
    if (isFocused) {
      const timer = setTimeout(() => setMountCamera(true), 300); // 300ms delay
      return () => clearTimeout(timer);
    } else {
      setMountCamera(false);
      setIsCameraReady(false);
    }
  }, [isFocused]);

  useEffect(() => {
    const init = async () => {
      // 1. Permissions
      const cameraStatus = await requestPermission();
      const locStatus = await Location.requestForegroundPermissionsAsync();
      
      if (!cameraStatus.granted || locStatus.status !== 'granted') {
        setScreenState('error');
        setErrorDetails('Camera and Location permissions are required.');
        return;
      }

      // 2. Fetch Challenges
      try {
        const res = await attendance.getLivenessChallenges();
        if (res.success && res.challenges.length > 0) {
          setChallenges(res.challenges);
          setScreenState('ready');
          setStatusMessage('Align your face to start');
          startPulse();
        } else {
          throw new Error('No verification challenges received.');
        }
      } catch (e: any) {
        setScreenState('error');
        setErrorDetails(e.message);
      }
    };

    if (isFocused && screenState === 'initializing') {
      init();
    }
  }, [isFocused]);

  // --- Core Logic: Auto-Sequence ---
  
  // Triggered when state becomes 'countdown'
  useEffect(() => {
    if (screenState === 'countdown') {
      runChallengeSequence();
    }
  }, [screenState, currentIndex]);

  const runChallengeSequence = async () => {
    // 1. Show Visual Instruction (Flash Icon)
    flashOverlay();
    
    // 2. Countdown (3-2-1)
    for (let i = 2; i > 0; i--) {
      setCountdown(i);
      // Vibration.vibrate(Platform.OS === 'ios' ? 'impactLight' : 30);
      Vibration.vibrate();
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // 3. Capture
    setCountdown(null);
    setScreenState('capturing');
    await captureAndProcess();
  };

  const captureAndProcess = async () => {
    if (!cameraRef.current || !isCameraReady) {
      console.warn("Camera not ready for capture");
      setScreenState('error');
      setErrorDetails('Camera not ready. Please try again.');
      return;
    };

    try {
      // Vibration.vibrate(Platform.OS === 'ios' ? 'impactMedium' : 50);
      Vibration.vibrate();

      // Fast capture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4, // Lower quality for speed (Rekognition works fine with this)
        base64: true, 
        skipProcessing: true,
      });

      if (!photo?.base64) throw new Error('Camera capture failed');

      // Async Optimize (don't block UI if possible, but we need base64)
      const optimized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 500 } }], // Resize small for fast upload
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const newRecord: CapturedChallenge = {
        challengeType: challenges[currentIndex].type,
        image: `data:image/jpeg;base64,${optimized.base64}`,
      };

      setCapturedData(prev => {
        const newData = [...prev, newRecord];
        
        // DECISION: Next Step or Submit?
        if (currentIndex < challenges.length - 1) {
          // Prepare next challenge
          setTimeout(() => {
            setCurrentIndex(idx => idx + 1);
            setScreenState('countdown'); // Loop triggers again
          }, 500); // Brief pause between challenges
        } else {
          // All done
          handleSubmit(newData);
        }
        return newData;
      });

    } catch (e) {
      console.error(e);
      setScreenState('error');
      setErrorDetails('Failed to capture. Please restart.');
    }
  };

  const handleSubmit = async (finalData: CapturedChallenge[]) => {
    setScreenState('submitting');
    setStatusMessage('Verifying Identity...');

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      const res = await attendance.submitWithFaceVerification({
        classId,
        studentCoordinates: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        challengeImages: finalData
      });

      if (res.success) {
        setScreenState('success');
        Vibration.vibrate([0, 100, 100, 100]); // Success pattern

        // Navigate back after delay
        setTimeout(() => {
          // Check if we can go back, otherwise go Home
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            // Fallback if history is empty
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }, 2000);
      } else {
        throw new Error(res.message || 'Verification Failed');
      }
    } catch (e: any) {
      setScreenState('error');
      setErrorDetails(e.message || 'Server error during verification');
    }
  };

  // --- Visual Helpers ---

  const getInstructionIcon = (type: string) => {
    switch (type) {
      case 'smile': return 'emoticon-happy-outline';
      case 'turn_left': return 'arrow-left-bold-circle-outline';
      case 'turn_right': return 'arrow-right-bold-circle-outline';
      case 'look_up': return 'arrow-up-bold-circle-outline';
      case 'eyes_open': return 'eye-outline';
      default: return 'face-recognition';
    }
  };

  const getInstructionText = (type: string) => {
    switch (type) {
      case 'smile': return 'Smile!';
      case 'turn_left': return 'Turn Head Left';
      case 'turn_right': return 'Turn Head Right';
      case 'look_up': return 'Look Up';
      default: return 'Look at Camera';
    }
  };

  const currentChallenge = challenges[currentIndex];

  // --- Render ---

  if (screenState === 'error') {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.onSurface }]}>{errorDetails}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>Close</Button>
      </View>
    );
  }

  if (screenState === 'success') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.primaryContainer }]}>
        <MaterialCommunityIcons name="check-circle" size={80} color={colors.primary} />
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginTop: 16, color: colors.onPrimaryContainer }}>Verified!</Text>
        <Text variant="bodyMedium" style={{ color: colors.onPrimaryContainer }}>Attendance marked successfully.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mountCamera && (
        <CameraView 
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          active={isFocused && screenState !== 'submitting'}
          onCameraReady={() => setIsCameraReady(true)}
        />
      )}

      {/* Dark Overlay with Transparent Oval */}
      <View style={styles.maskContainer}>
        <View style={styles.maskTop} />
        <View style={styles.maskMiddle}>
          <View style={styles.maskSide} />
          <View style={styles.ovalContainer}>
            <Animated.View 
              style={[
                styles.faceOval, 
                { 
                  transform: [{ scale: pulseAnim }],
                  borderColor: screenState === 'capturing' ? colors.primary : '#fff'
                }
              ]} 
            />
            
            {/* Contextual Icon Overlay (Inside Oval) */}
            {currentChallenge && screenState !== 'ready' && (
              <Animated.View style={[styles.iconOverlay, { opacity: overlayAnim }]}>
                <MaterialCommunityIcons 
                  name={getInstructionIcon(currentChallenge.type) as any} 
                  size={80} 
                  color="rgba(255,255,255,0.8)" 
                />
              </Animated.View>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={styles.maskBottom}>
          {/* Bottom UI */}
          <View style={styles.bottomUi}>
            {screenState === 'ready' ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.instructionTitle}>Face Verification</Text>
                <Text style={styles.instructionSub}>
                  You will be asked to perform {challenges.length} simple actions.
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => setScreenState('countdown')}
                  disabled={!isCameraReady}
                  loading={!isCameraReady}
                  style={styles.startButton}
                  contentStyle={{ height: 48 }}
                >
                  {isCameraReady ? 'Start Verification' : 'Initializing Camera...'}
                </Button>
              </View>
            ) : screenState === 'submitting' ? (
               <View style={{ alignItems: 'center' }}>
                 <ActivityIndicator size="large" color="#fff" />
                 <Text style={styles.statusText}>{statusMessage}</Text>
               </View>
            ) : (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.liveInstruction}>
                  {currentChallenge ? getInstructionText(currentChallenge.type) : 'Preparing...'}
                </Text>
                <ProgressBar 
                  progress={(currentIndex + 1) / challenges.length} 
                  color={colors.primary} 
                  style={styles.progress} 
                />
                <Text style={styles.stepText}>Step {currentIndex + 1} of {challenges.length}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { marginTop: 16, textAlign: 'center', fontSize: 16 },
  
  // Mask System for Oval
  maskContainer: { flex: 1 },
  maskTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  maskMiddle: { flexDirection: 'row', height: OVAL_HEIGHT },
  maskSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  maskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  
  ovalContainer: { width: OVAL_WIDTH, height: OVAL_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  faceOval: {
    width: '100%',
    height: '100%',
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 4,
    backgroundColor: 'transparent',
  },

  // Overlays
  iconOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countdownOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 80, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },

  // Bottom UI
  bottomUi: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  instructionTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  instructionSub: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 },
  startButton: { width: '100%', borderRadius: 30 },
  
  liveInstruction: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase' },
  progress: { width: '100%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepText: { color: 'rgba(255,255,255,0.6)', marginTop: 8, fontSize: 12 },
  statusText: { color: '#fff', marginTop: 16, fontSize: 16 },
});

export default FaceLivenessScreen;