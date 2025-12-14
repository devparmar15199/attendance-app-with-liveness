import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar, useTheme, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { users } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'UpdateFace'>;

const { width: screenWidth } = Dimensions.get('window');
const OVAL_WIDTH = screenWidth * 0.7;
const OVAL_HEIGHT = screenWidth * 0.95;

const UpdateFaceScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  
  // Store
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  // State
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', isError: false });

  // --- Logic ---

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (photo?.uri) {
        // Optimize image (Resize to 800px width, compress 0.7)
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setCapturedImage(manipulated.uri);
      }
    } catch (error) {
      setSnackbar({ visible: true, message: 'Failed to capture image.', isError: true });
    }
  };

  const handleUpload = async () => {
    if (!capturedImage) return;

    setLoading(true);
    try {
      const formData = new FormData();
      const filename = capturedImage.split('/').pop() || 'face.jpg';

      // Append image as file
      formData.append('faceImage', {
        uri: capturedImage,
        name: filename,
        type: 'image/jpeg',
      } as any);

      const response = await users.updateFaceImage(formData);

      // Update local user state if successful
      if (user) {
        updateUser({ ...user, hasFaceImage: response.hasFaceImage });
      }

      setSnackbar({ visible: true, message: 'Face updated successfully!', isError: false });
      
      // Delay navigation slightly for feedback
      setTimeout(() => navigation.goBack(), 1500);

    } catch (error: any) {
      console.error(error);
      setSnackbar({ visible: true, message: error.message || 'Upload failed.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  // --- Render Helpers ---

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { padding: 20 }]}>
        <MaterialCommunityIcons name="camera-off" size={64} color={colors.error} />
        <Text variant="titleMedium" style={{ marginTop: 16, textAlign: 'center' }}>
          Camera permission is needed to update your face data.
        </Text>
        <Button mode="contained" onPress={requestPermission} style={{ marginTop: 24 }}>
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      
      {/* 1. Camera View */}
      {!capturedImage ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            onCameraReady={() => setIsCameraReady(true)}
          />
          {/* Overlay Mask */}
          <View style={styles.maskContainer}>
            <View style={styles.maskTop} />
            <View style={styles.maskMiddle}>
              <View style={styles.maskSide} />
              <View style={styles.ovalFrame} />
              <View style={styles.maskSide} />
            </View>
            <View style={styles.maskBottom}>
              <Text style={styles.guidanceText}>Position your face within the oval</Text>
              <IconButton
                icon="circle-slice-8"
                size={80}
                iconColor="white"
                onPress={handleCapture}
                disabled={!isCameraReady}
                style={styles.captureBtn}
              />
            </View>
          </View>
        </View>
      ) : (
        // 2. Preview View
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
          
          <View style={[styles.actionPanel, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>Confirm New Photo</Text>
            <Text variant="bodyMedium" style={{ marginBottom: 24, textAlign: 'center', color: colors.onSurfaceVariant }}>
              Ensure your face is clearly visible and well-lit. This will replace your current verification data.
            </Text>
            
            <View style={styles.buttonRow}>
              <Button 
                mode="outlined" 
                onPress={() => setCapturedImage(null)} 
                style={{ flex: 1, marginRight: 8 }}
                disabled={loading}
              >
                Retake
              </Button>
              <Button 
                mode="contained" 
                onPress={handleUpload} 
                loading={loading}
                disabled={loading}
                style={{ flex: 1, marginLeft: 8 }}
              >
                Update
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Snackbar Feedback */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        style={{ backgroundColor: snackbar.isError ? colors.errorContainer : colors.primaryContainer }}
      >
        <Text style={{ color: snackbar.isError ? colors.onErrorContainer : colors.onPrimaryContainer }}>
          {snackbar.message}
        </Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraContainer: { flex: 1 },
  
  // Mask Styles
  maskContainer: { flex: 1 },
  maskTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  maskMiddle: { flexDirection: 'row', height: OVAL_HEIGHT },
  maskSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  maskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', paddingTop: 20 },
  ovalFrame: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  guidanceText: { color: 'white', fontSize: 16, marginBottom: 20, fontWeight: '600' },
  captureBtn: { margin: 0, padding: 0 },

  // Preview Styles
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1 },
  actionPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  buttonRow: { flexDirection: 'row', width: '100%' },
});

export default UpdateFaceScreen;