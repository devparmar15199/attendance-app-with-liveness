import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Snackbar,
  useTheme,
  Portal,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { users } from '../services/api';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

const ChangePasswordScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isCurrentPasswordSecure, setIsCurrentPasswordSecure] = useState(true);
  const [isNewPasswordSecure, setIsNewPasswordSecure] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill out all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await users.changePassword({
        currentPassword,
        newPassword,
      });
      setSuccess(response.message || 'Password changed successfully!');
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
    <View style={[styles.flexContainer, { backgroundColor: colors.elevation.level1 }]}>
      <ScrollView
        style={styles.flexContainer}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={styles.title}>
          Update Your Password
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Your new password must be at least 6 characters long.
        </Text>

        <Card
          style={[styles.card, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <Card.Content>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={isCurrentPasswordSecure}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={isCurrentPasswordSecure ? 'eye-off' : 'eye'}
                  onPress={() =>
                    setIsCurrentPasswordSecure(!isCurrentPasswordSecure)
                  }
                />
              }
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={isNewPasswordSecure}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={isNewPasswordSecure ? 'eye-off' : 'eye'}
                  onPress={() =>
                    setIsNewPasswordSecure(!isNewPasswordSecure)
                  }
                />
              }
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={isNewPasswordSecure}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="lock-outline" />}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleChangePassword}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Update Password
        </Button>
      </ScrollView>

      <Portal>
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
        <Snackbar
          visible={!!success}
          onDismiss={() => setSuccess('')}
          duration={2000}
          style={{ backgroundColor: colors.primaryContainer }}
          action={{
            label: 'Dismiss',
            onPress: () => setSuccess(''),
            textColor: colors.onPrimaryContainer,
          }}
        >
          <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  card: {},
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16, // Add margin from the card
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;