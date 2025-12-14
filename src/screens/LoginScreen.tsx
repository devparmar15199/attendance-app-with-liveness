import React, { useState, useRef } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { TextInput, Button, Snackbar, Text, useTheme, Divider, HelperText } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList } from '../types';
import AuthContainer from '../components/auth/AuthContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const [identifier, setIdentifier] = useState(''); // Email or Enrollment No
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Refs for keyboard navigation
  const passwordRef = useRef<any>(null);

  const login = useAuthStore((state) => state.login);
  const { colors } = useTheme();

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError('');

    if (!identifier || !password) {
      setError('Please enter both your ID/Email and Password.');
      return;
    }

    setLoading(true);
    try {
      // Robust check: If it contains '@', treat as email, else enrollment
      const isEmail = identifier.includes('@');
      const loginData = {
        email: isEmail ? identifier.trim() : undefined,
        enrollmentNo: !isEmail ? identifier.trim() : undefined,
        password,
      };

      await login(loginData);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <AuthContainer title="Welcome Back" subtitle="Sign in to continue">

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <TextInput
            label="Enrollment No. or Email"
            value={identifier}
            onChangeText={setIdentifier}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            disabled={loading}
            left={<TextInput.Icon icon="account-outline" />}
            error={!!error && !identifier}
          />

          <TextInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry={!passwordVisible}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            disabled={loading}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={passwordVisible ? 'eye-off' : 'eye'}
                onPress={() => setPasswordVisible(!passwordVisible)}
              />
            }
            error={!!error && !password}
          />

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordButton}
            labelStyle={styles.linkText}
            compact
          >
            Forgot Password?
          </Button>
        </View>

        {/* Actions Section */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {loading ? 'Signing In...' : 'Login'}
          </Button>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text
              style={[styles.dividerText, { color: colors.onSurfaceVariant }]}
            >
              OR
            </Text>
            <Divider style={styles.divider} />
          </View>

          {/* Register */}
          <View style={styles.registerContainer}>
            <Text
              style={[styles.registerText, { color: colors.onSurfaceVariant }]}
            >
              Don't have an account?{' '}
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              labelStyle={[styles.linkText, styles.registerText]}
              compact
            >
              Register
            </Button>
          </View>
        </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  inputContainer: {
    marginTop: 10,
  },
  input: {
    marginBottom: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  linkText: {
    fontWeight: '600',
    fontSize: 14,
  },
  registerLink: {
    marginLeft: -8,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
  },
});

export default LoginScreen;