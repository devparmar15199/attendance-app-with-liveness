import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TextInput,
  Button,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList } from '../types';
import AuthContainer from '../components/auth/AuthContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [identifier, setIdentifier] = useState(''); // Email or Enrollment No
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // For success message

  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const { colors } = useTheme();

  const handleSendLink = async () => {
    setError('');
    setSuccess('');
    if (!identifier) {
      setError('Please enter your email or enrollment number');
      return;
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes('@');
      const data = {
        email: isEmail ? identifier : undefined,
        enrollmentNo: !isEmail ? identifier : undefined,
      };

      await forgotPassword(data);
      setSuccess('If an account exists, a reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <AuthContainer
        title="Reset Password"
        subtitle="Enter your email or enrollment no. to receive a reset link."
      >
        <TextInput
          label="Enrollment No. or Email"
          value={identifier}
          onChangeText={setIdentifier}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={loading}
          left={<TextInput.Icon icon="account-outline" />}
        />

        <Button
          mode="contained"
          onPress={handleSendLink}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Send Reset Link
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
          style={styles.textButton}
        >
          Back to Login
        </Button>
      </AuthContainer>

      {/* Error Snackbar */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.errorContainer }}
        action={{
          label: 'Dismiss',
          textColor: colors.onErrorContainer,
          onPress: () => setError(''),
        }}
      >
        <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={4000}
        style={{ backgroundColor: colors.primaryContainer }}
        action={{
          label: 'Dismiss',
          textColor: colors.onPrimaryContainer,
          onPress: () => setSuccess(''),
        }}
      >
        <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  input: {
    marginBottom: 20, // More space before the button
  },
  button: {
    // Uses theme roundness
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textButton: {
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;