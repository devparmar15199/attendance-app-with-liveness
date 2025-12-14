import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Vibration,
} from 'react-native';
import { Text, useTheme, Button, ProgressBar } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { attendance } from '../services/api';
import { RootStackParamList, LivenessChallenge } from '../types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImageManipulator from 'expo-image-manipulator';

type Props = NativeStackScreenProps<RootStackParamList, 'FaceLiveness'>;

const { width: screenWidth } = Dimensions.get('window');
const OVAL_WIDTH = screenWidth * 0.75;
const OVAL_HEIGHT = screenWidth * 0.95;

type ScreenState = 
  | 'loading' 
  | 'permission_denied'
  | 'ready' 
  | 'challenge' 
  | 'capturing'
  | 'processing'
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
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  // Screen state
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [message, setMessage] = useState('Initializing...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Challenge state
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [capturedChallenges, setCapturedChallenges] = useState<CapturedChallenge[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);

  // Start pulse animation for oval
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Request permissions
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Camera permission
        if (!permission?.granted) {
          const cameraResult = await requestPermission();
          if (!cameraResult.granted) {
            setScreenState('permission_denied');
            return;
          }
        }

        // Location permission
        const locResult = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locResult.status === 'granted');
        
        if (locResult.status !== 'granted') {
          setScreenState('permission_denied');
          setMessage('Location permission is required for attendance verification.');
          return;
        }

        // Fetch challenges from backend
        await fetchChallenges();
      } catch (error) {
        console.error('Permission error:', error);
        setScreenState('error');
        setErrorMessage('Failed to initialize. Please try again.');
      }
    };

    requestPermissions();
  }, [permission, requestPermission]);

  // Fetch liveness challenges from backend
  const fetchChallenges = async () => {
    try {
      setMessage('Loading verification challenges...');
      const response = await attendance.getLivenessChallenges();
      
      if (response.success && response.challenges.length > 0) {
        setChallenges(response.challenges);
        setScreenState('ready');
        setMessage('Position your face in the frame');
        startPulseAnimation();
      } else {
        throw new Error('No challenges received');
      }
    } catch (error: any) {
      console.error('Failed to fetch challenges:', error);
      setScreenState('error');
      setErrorMessage(error.message || 'Failed to load verification. Please try again.');
    }
  };

  // Get icon for challenge type
  const getChallengeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'neutral': 'face-man',
      'smile': 'emoticon-happy-outline',
      'turn_left': 'arrow-left-bold',
      'turn_right': 'arrow-right-bold',
      'eyes_open': 'eye-outline',
      'look_up': 'arrow-up-bold',
    };
    return icons[type] || 'face-recognition';
  };

  // Start countdown and capture
  const startChallenge = () => {
    if (isCountingDown) return;
    
    setScreenState('challenge');
    setIsCountingDown(true);
    setCountdown(3);
    
    // Countdown from 3
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      Vibration.vibrate(50);
      
      if (count === 0) {
        clearInterval(countdownInterval);
        captureChallenge();
      }
    }, 1000);
  };

  // Capture photo for current challenge
  const captureChallenge = async () => {
    if (!cameraRef.current) {
      setIsCountingDown(false);
      return;
    }

    setScreenState('capturing');
    setMessage('Hold still...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture photo');
      }

      // Optimize image
      const optimized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!optimized.base64) {
        throw new Error('Failed to process image');
      }

      const currentChallenge = challenges[currentChallengeIndex];
      const base64Image = `data:image/jpeg;base64,${optimized.base64}`;

      // Add to captured challenges
      const newCaptured: CapturedChallenge = {
        challengeType: currentChallenge.type,
        image: base64Image,
      };
      
      const updatedCaptured = [...capturedChallenges, newCaptured];
      setCapturedChallenges(updatedCaptured);

      // Check if all challenges complete
      if (currentChallengeIndex >= challenges.length - 1) {
        // All challenges captured, submit
        await submitAttendance(updatedCaptured);
      } else {
        // Move to next challenge
        setCurrentChallengeIndex(prev => prev + 1);
        setScreenState('ready');
        setMessage('Great! Next challenge...');
        setIsCountingDown(false);
        
        // Auto-start next challenge after a brief pause
        setTimeout(() => {
          setMessage('Position your face and tap Continue');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Capture error:', error);
      setScreenState('error');
      setErrorMessage(error.message || 'Failed to capture image. Please try again.');
      setIsCountingDown(false);
    }
  };

  // Submit attendance with all captured challenge images
  const submitAttendance = async (capturedImages: CapturedChallenge[]) => {
    setScreenState('submitting');
    setMessage('Verifying your identity...');

    try {
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const response = await attendance.submitWithFaceVerification({
        classId,
        studentCoordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        challengeImages: capturedImages,
      });

      if (response.success) {
        setScreenState('success');
        setMessage('Attendance marked successfully!');
        Vibration.vibrate([0, 100, 50, 100]);

        // Navigate back after delay
        setTimeout(() => {
          navigation.goBack();
        }, 2500);
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      setScreenState('error');
      setErrorMessage(error.message || 'Failed to verify. Please try again.');
    }
  };

  // Retry the entire flow
  const handleRetry = () => {
    setScreenState('loading');
    setChallenges([]);
    setCurrentChallengeIndex(0);
    setCapturedChallenges([]);
    setErrorMessage(null);
    setIsCountingDown(false);
    fetchChallenges();
  };

  // Calculate progress
  const progress = challenges.length > 0 
    ? (currentChallengeIndex + (screenState === 'success' ? 1 : 0)) / challenges.length 
    : 0;

  // Current challenge info
  const currentChallenge = challenges[currentChallengeIndex];

  // --- RENDER STATES ---

  // Loading state
  if (screenState === 'loading') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.messageText} variant="titleMedium">
          {message}
        </Text>
      </View>
    );
  }

  // Permission denied
  if (screenState === 'permission_denied' || !permission?.granted || !locationPermission) {
    return (
      <View style={[styles.container, styles.centerContent, { padding: 30 }]}>
        <MaterialCommunityIcons
          name="shield-alert-outline"
          size={80}
          color={colors.error}
        />
        <Text style={[styles.messageText, { marginTop: 20 }]} variant="headlineSmall">
          Permissions Required
        </Text>
        <Text style={[styles.messageText, { opacity: 0.8 }]} variant="bodyLarge">
          Camera and location permissions are required for face verification.
        </Text>
        <Button
          mode="contained"
          onPress={async () => {
            await requestPermission();
            await Location.requestForegroundPermissionsAsync();
          }}
          style={{ marginTop: 20, width: '80%' }}
        >
          Grant Permissions
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 10 }}
          textColor="white"
        >
          Back
        </Button>
      </View>
    );
  }

  // Error state
  if (screenState === 'error') {
    return (
      <View style={[styles.container, styles.centerContent, { padding: 30 }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={80}
          color={colors.error}
        />
        <Text style={[styles.messageText, { marginTop: 20 }]} variant="headlineSmall">
          Verification Failed
        </Text>
        <Text style={[styles.messageText, { opacity: 0.8 }]} variant="bodyLarge">
          {errorMessage}
        </Text>
        <Button
          mode="contained"
          onPress={handleRetry}
          style={{ marginTop: 30, width: '80%' }}
        >
          Try Again
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 10 }}
          textColor="white"
        >
          Cancel
        </Button>
      </View>
    );
  }

  // Success state
  if (screenState === 'success') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons
          name="check-circle"
          size={120}
          color={colors.primary}
        />
        <Text style={[styles.messageText, { marginTop: 20 }]} variant="headlineMedium">
          Success!
        </Text>
        <Text style={styles.messageText} variant="titleMedium">
          {message}
        </Text>
      </View>
    );
  }

  // Submitting state
  if (screenState === 'submitting') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.messageText, { marginTop: 20 }]} variant="titleMedium">
          {message}
        </Text>
        <Text style={[styles.messageText, { opacity: 0.7 }]} variant="bodyMedium">
          Please wait...
        </Text>
      </View>
    );
  }

  // Main camera view with challenges
  return (
    <View style={styles.container}>
      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          active={isFocused && ['ready', 'challenge', 'capturing'].includes(screenState)}
        />

        {/* Face oval overlay */}
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.faceOval,
              { 
                transform: [{ scale: pulseAnim }],
                borderColor: isCountingDown ? colors.primary : '#FFF',
              }
            ]}
          />
          
          {/* Countdown overlay */}
          {isCountingDown && countdown > 0 && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom UI */}
      <View style={styles.bottomContainer}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={progress} 
            color={colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            Challenge {currentChallengeIndex + 1} of {challenges.length}
          </Text>
        </View>

        {/* Challenge instruction */}
        {currentChallenge && (
          <View style={styles.challengeContainer}>
            <MaterialCommunityIcons
              name={getChallengeIcon(currentChallenge.type) as any}
              size={48}
              color={colors.primary}
            />
            <Text style={styles.challengeText} variant="titleLarge">
              {currentChallenge.instruction}
            </Text>
          </View>
        )}

        {/* Status message */}
        <Text style={styles.messageText} variant="bodyLarge">
          {screenState === 'capturing' ? 'Hold still...' : message}
        </Text>

        {/* Action buttons */}
        {screenState === 'ready' && !isCountingDown && (
          <Button
            mode="contained"
            onPress={startChallenge}
            style={styles.captureButton}
            contentStyle={styles.captureButtonContent}
            labelStyle={styles.captureButtonLabel}
          >
            {currentChallengeIndex === 0 ? 'Start Verification' : 'Continue'}
          </Button>
        )}

        {!isCountingDown && screenState !== 'capturing' && (
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            textColor="white"
          >
            Cancel
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  countdownContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    paddingBottom: 40,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 15,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  challengeContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  challengeText: {
    color: '#FFF',
    marginTop: 10,
    textAlign: 'center',
  },
  messageText: {
    color: '#FFF',
    textAlign: 'center',
    marginVertical: 8,
  },
  captureButton: {
    marginTop: 15,
    width: '90%',
  },
  captureButtonContent: {
    paddingVertical: 10,
  },
  captureButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 10,
  },
});

export default FaceLivenessScreen;