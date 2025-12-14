import React, { useState } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import {
  TextInput,
  Button,
  Snackbar,
  Text,
  useTheme,
  HelperText
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList } from '../types';
import AuthContainer from '../components/auth/AuthContainer';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const { colors } = useTheme();

  const handleSendLink = async () => {
    Keyboard.dismiss();
    setError('');
    setSuccess('');
    
    if (!identifier.trim()) {
      setError('Please enter your email or enrollment number.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes('@');
      const data = {
        email: isEmail ? identifier.trim() : undefined,
        enrollmentNo: !isEmail ? identifier.trim() : undefined,
      };

      await forgotPassword(data);
      setSuccess('Reset link sent! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to process request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AuthContainer
        title="Reset Password"
        subtitle="Don't worry! It happens. Please enter the email associated with your account."
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-reset" size={64} color={colors.primary} />
        </View>

        <TextInput
          label="Enrollment No. or Email"
          value={identifier}
          onChangeText={setIdentifier}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={loading}
          left={<TextInput.Icon icon="account-search" />}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleSendLink}
        />
        
        <HelperText type="info" visible={true} style={{ marginBottom: 16 }}>
          We will send a password recovery link to your registered email.
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSendLink}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
        >
          Send Instructions
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.backButton}
        >
          Back to Login
        </Button>
      </AuthContainer>

      {/* Feedback Snackbars */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.errorContainer }}
      >
        <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={5000}
        style={{ backgroundColor: colors.primaryContainer }}
        action={{ label: 'Login', onPress: () => navigation.navigate('Login') }}
      >
        <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  input: { marginBottom: 4 },
  button: { borderRadius: 8 },
  backButton: { marginTop: 16 },
});

export default ForgotPasswordScreen;