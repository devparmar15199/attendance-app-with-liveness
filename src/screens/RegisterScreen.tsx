import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { TextInput, Button, Text, Snackbar, ActivityIndicator, ProgressBar, useTheme, 
  TouchableRipple, SegmentedButtons, HelperText, Portal, Dialog, RadioButton } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList } from '../types';
import AuthContainer from '../components/auth/AuthContainer';

// --- Constants ---
const YEAR_OPTIONS = [
  { label: '1st', value: '1' },
  { label: '2nd', value: '2' },
  { label: '3rd', value: '3' },
  { label: '4th', value: '4' },
];

// Generate semesters 1-8
const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  label: `Semester ${i + 1}`,
  value: String(i + 1),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const register = useAuthStore((state) => state.register);
  const { colors } = useTheme();

  // Form Field State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [password, setPassword] = useState('');
  const [division, setDivision] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('1');
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);

  // UI State
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1. Info, 2. Face Capture
  
  // Refs
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const enrollmentRef = useRef<any>(null);
  const divisionRef = useRef<any>(null);
  const cameraRef = useRef<CameraView>(null);

  // --- Modals ---
  const [showSemesters, setShowSemesters] = useState(false);
  
  // --- Permissions ---
  const [permission, requestPermission] = useCameraPermissions();

  // --- Validation Helpers ---
  const hasStep1Errors = () => {
    return !fullName || !email || !email.includes('@') || !password || password.length < 6 || !enrollmentNo || !division || !selectedSemester;
  };

  const handleCaptureFace = async () => {
    if (!cameraRef.current) return;

    setLoading(true);
    setError('');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        exif: false,
      });

      if (photo && photo.uri) {
        const manipResult = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );

        setFaceImageUri(manipResult.uri);
      } else {
        throw new Error('Failed to capture photo');
      }
    } catch (err: any) {
      setError('Failed to capture face. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!faceImageUri) {
      setError('Face capture is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      
      formData.append('fullName', fullName.trim());
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('role', 'student');
      formData.append('enrollmentNo', enrollmentNo.trim());
      formData.append('classYear', selectedYear);
      formData.append('semester', selectedSemester);
      formData.append('division', division.trim());

      // Append Optimized Image
      const filename = faceImageUri.split('/').pop() || 'face.jpg';
      formData.append('faceImage', {
        uri: faceImageUri,
        name: filename,
        type: 'image/jpeg',
      } as any);
      // const base64 = await FileSystem.readAsStringAsync(faceImageUri, {
      //   encoding: 'base64',
      // });
      // const faceImageBase64 = `data:image/jpeg;base64,${base64}`;

      // const registrationData: RegistrationData = {
      //   fullName,
      //   email: email.trim(),
      //   password,
      //   role: 'student',
      //   enrollmentNo: enrollmentNo.trim(),
      //   classYear: selectedYear,
      //   semester: selectedSemester,
      //   faceImage: faceImageBase64,
      // };
      await register(formData);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 1: Details Form ---
  const renderStepOne = () => (
    <>
      <Text
        variant="titleMedium"
        style={[styles.stepTitle, { color: colors.onSurface }]}
      >
        Step 1: Academic Details
      </Text>

      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        left={<TextInput.Icon icon="account" />}
      />

      <TextInput
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        mode="outlined"
        style={styles.input}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        left={<TextInput.Icon icon="email" />}
      />
      {email.length > 0 && !email.includes('@') && (
        <HelperText type="error" visible={true}>Invalid email address</HelperText>
      )}

      <TextInput
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!passwordVisible}
        mode="outlined"
        style={styles.input}
        returnKeyType="next"
        onSubmitEditing={() => enrollmentRef.current?.focus()}
        left={<TextInput.Icon icon="lock" />}
        right={
          <TextInput.Icon
            icon={passwordVisible ? 'eye-off' : 'eye'}
            onPress={() => setPasswordVisible(!passwordVisible)}
          />
        }
      />
      {password.length > 0 && password.length < 6 && (
        <HelperText type="error" visible={true}>Password must be at least 6 characters</HelperText>
      )}

      <TextInput
        ref={enrollmentRef}
        label="Enrollment No."
        value={enrollmentNo}
        onChangeText={setEnrollmentNo}
        autoCapitalize="characters"
        mode="outlined"
        style={styles.input}
        returnKeyType="next"
        onSubmitEditing={() => divisionRef.current?.focus()}
        left={<TextInput.Icon icon="card-account-details" />}
      />
      
      <View style={styles.row}>
        <TextInput
          ref={divisionRef}
          label="Division"
          value={division}
          onChangeText={setDivision}
          mode="outlined"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          left={<TextInput.Icon icon="domain" />}
        />
        
        {/* Semester Selector Trigger */}
        <TouchableRipple 
          onPress={() => setShowSemesters(true)} 
          style={{ flex: 1 }}
        >
          <View pointerEvents="none">
            <TextInput
              label="Semester"
              value={selectedSemester ? `Sem ${selectedSemester}` : ''}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="chevron-down" />}
              editable={false}
            />
          </View>
        </TouchableRipple>
      </View>

      <Text
        variant="labelMedium"
        style={{ color: colors.onSurfaceVariant, marginBottom: 8, marginTop: 4 }}
      >
        Class Year
      </Text>
      <SegmentedButtons
        value={selectedYear}
        onValueChange={setSelectedYear}
        buttons={YEAR_OPTIONS}
        style={styles.segmentedButtons}
        density="small"
      />

      <Button
        mode="contained"
        onPress={() => setStep(2)}
        disabled={hasStep1Errors()}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Next: Face Capture
      </Button>
    </>
  );

  // Step 2: Face Capture
  const renderStepTwo = () => (
    <>
      <Text
        variant="titleMedium"
        style={[styles.stepTitle, { color: colors.onSurface }]}>
        Step 2: Face Verification
      </Text>
      <Text style={[styles.guidanceText, { color: colors.onSurfaceVariant }]}>
        Ensure you are in good lighting. Align your face within the circle.
      </Text>

      <View
        style={[
          styles.cameraContainer,
          {
            borderColor: faceImageUri ? colors.primary : colors.outline,
          },
        ]}
      >
        {faceImageUri ? (
          <Image source={{ uri: faceImageUri }} style={styles.cameraPreview} />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
        )}
      </View>

      {faceImageUri ? (
        <Button
          icon="refresh"
          mode="outlined"
          onPress={() => setFaceImageUri(null)}
          style={styles.button}
        >
          Retake Photo
        </Button>
      ) : (
        <Button
          icon="camera"
          mode="contained-tonal"
          onPress={handleCaptureFace}
          disabled={loading}
          style={styles.button}
        >
          Capture
        </Button>
      )}

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading || !faceImageUri}
        style={[styles.button, { marginTop: 24 }]}
        contentStyle={styles.buttonContent}
      >
        Complete Registration
      </Button>
    </>
  );

  // --- Permission Guard ---
  if (!permission) return <ActivityIndicator style={styles.centered} />;
  
  if (!permission.granted) {
    return (
      <AuthContainer title="Camera Access" subtitle="Required for face registration">
        <Button mode="contained" onPress={requestPermission}>Grant Permission</Button>
        <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>Back</Button>
      </AuthContainer>
    );
  }

  return (
    <View style={[styles.flexContainer, { backgroundColor: colors.background }]}>
      <AuthContainer title="Create Account">
        <ProgressBar
          progress={step / 2}
          color={colors.primary}
          style={styles.progressBar}
        />

        {step === 1 ? renderStepOne() : renderStepTwo()}

        <Button
          mode="text"
          onPress={() => step > 1 ? setStep(1) : navigation.navigate('Login')}
          disabled={loading}
          style={styles.textButton}
          compact
        >
          {step > 1 ? 'Back to Details' : 'Already have an account? Login'}
        </Button>
      </AuthContainer>

      {/* Semester Selection Dialog */}
      <Portal>
        <Dialog visible={showSemesters} onDismiss={() => setShowSemesters(false)}>
          <Dialog.Title>Select Semester</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 300, paddingHorizontal: 0 }}>
            <ScrollView>
              {SEMESTER_OPTIONS.map((opt) => (
                <RadioButton.Item
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  status={selectedSemester === opt.value ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setSelectedSemester(opt.value);
                    setShowSemesters(false);
                  }}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowSemesters(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbars */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.errorContainer }}
        action={{
          label: 'Dismiss',
          onPress: () => setError(''),
          textColor: colors.onErrorContainer,
        }}
      >
        <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmentedButtons: {
    marginBottom: 20,
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  textButton: {
    marginTop: 16,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  guidanceText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  progressBar: {
    opacity: 0.8,
    marginBottom: 24,
    borderRadius: 3,
    height: 6,
  },
  cameraContainer: {
    width: 260,
    height: 260,
    marginBottom: 20,
    borderRadius: 130,
    overflow: 'hidden',
    borderWidth: 4,
    elevation: 4,
    alignSelf: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraPreview: {
    flex: 1,
    resizeMode: 'cover',
  },
});

export default RegisterScreen;