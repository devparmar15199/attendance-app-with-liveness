import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Snackbar,
  useTheme,
  Portal,
  HelperText,
  ProgressBar
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { users } from '../services/api';
import { RootStackParamList } from '../types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

const ChangePasswordScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Refs for keyboard navigation
  const newPasswordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);

  // State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Validations
  const isValidLength = newPassword.length >= 6;
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const getStrengthColor = () => {
    if (newPassword.length === 0) return colors.surfaceVariant;
    if (newPassword.length < 6) return colors.error;
    if (newPassword.length < 10) return '#FFC107'; // Amber
    return colors.primary; // Green/Primary
  };

  const getStrengthProgress = () => {
    if (newPassword.length === 0) return 0;
    return Math.min(newPassword.length / 10, 1);
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (!isValidLength) {
      setError('Password is too short.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await users.changePassword({
        currentPassword,
        newPassword,
      });
      setSuccess(response.message || 'Password changed successfully!');
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => navigation.goBack(), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: colors.onSurface }}>
            Secure Your Account
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
            Choose a strong password to protect your data.
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="contained">
          <Card.Content style={{ gap: 16 }}>
            
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!isCurrentVisible}
              mode="outlined"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
              right={<TextInput.Icon icon={isCurrentVisible ? 'eye-off' : 'eye'} onPress={() => setIsCurrentVisible(!isCurrentVisible)} />}
            />

            <View>
              <TextInput
                ref={newPasswordRef}
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!isNewVisible}
                mode="outlined"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                right={<TextInput.Icon icon={isNewVisible ? 'eye-off' : 'eye'} onPress={() => setIsNewVisible(!isNewVisible)} />}
              />
              <ProgressBar 
                progress={getStrengthProgress()} 
                color={getStrengthColor()} 
                style={styles.strengthBar} 
              />
            </View>

            <TextInput
              ref={confirmPasswordRef}
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isNewVisible}
              mode="outlined"
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
              error={confirmPassword.length > 0 && !passwordsMatch}
            />
          </Card.Content>
        </Card>

        {/* Requirements Checklist */}
        <View style={styles.requirementsContainer}>
          <RequirementRow 
            label="At least 6 characters" 
            met={isValidLength} 
            colors={colors} 
          />
          <RequirementRow 
            label="Passwords match" 
            met={passwordsMatch} 
            colors={colors} 
          />
        </View>

        <Button
          mode="contained"
          onPress={handleChangePassword}
          loading={loading}
          disabled={loading || !isValidLength || !passwordsMatch || !currentPassword}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
        >
          Update Password
        </Button>
      </ScrollView>

      <Portal>
        <Snackbar
          visible={!!error}
          onDismiss={() => setError('')}
          style={{ backgroundColor: colors.errorContainer }}
        >
          <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
        </Snackbar>
        <Snackbar
          visible={!!success}
          onDismiss={() => setSuccess('')}
          style={{ backgroundColor: colors.primaryContainer }}
        >
          <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
        </Snackbar>
      </Portal>
    </View>
  );
};

// Helper Component for Checklist
const RequirementRow = ({ label, met, colors }: any) => (
  <View style={styles.reqRow}>
    <MaterialCommunityIcons 
      name={met ? "check-circle" : "circle-outline"} 
      size={16} 
      color={met ? colors.primary : colors.onSurfaceVariant} 
    />
    <Text variant="bodySmall" style={{ marginLeft: 8, color: met ? colors.onSurface : colors.onSurfaceVariant }}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  card: { borderRadius: 12 },
  strengthBar: { height: 4, borderRadius: 2, marginTop: 6 },
  requirementsContainer: { marginTop: 16, marginLeft: 8, gap: 8 },
  reqRow: { flexDirection: 'row', alignItems: 'center' },
  button: { marginTop: 32 },
});

export default ChangePasswordScreen;