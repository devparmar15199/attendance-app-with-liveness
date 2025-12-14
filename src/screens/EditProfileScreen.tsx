import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Snackbar,
  useTheme,
  Portal,
  Avatar,
  List,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// We don't use ScreenContainer here to have a white background
// This matches the native settings-screen feel
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { users } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  // --- MODIFIED: Added state for new editable fields ---
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [classYear, setClassYear] = useState(user?.classYear || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [division, setDivision] = useState(user?.division || '');
  // --- END MODIFICATION ---

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');

    // --- MODIFIED: Updated validation message ---
    if (!fullName || !email) {
      setError('Full name and email are required.');
      return;
    }
    // --- END MODIFICATION ---

    setLoading(true);
    try {
      // --- MODIFIED: Send all editable fields to the API ---
      const updatedUser = await users.updateProfile({
        fullName,
        email,
        classYear,
        semester,
        division,
      });
      // --- END MODIFICATION ---

      updateUser(updatedUser);
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* --- Profile Header --- */}
        <View style={styles.header}>
          <Avatar.Text
            size={80}
            label={getInitials(user?.fullName)}
            style={{ backgroundColor: colors.primaryContainer }}
            labelStyle={{ color: colors.onPrimaryContainer }}
          />
          <Text
            style={[styles.title, { color: colors.onSurface }]}
            variant="headlineMedium"
          >
            {user?.fullName}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
            variant="titleMedium"
          >
            Edit your details
          </Text>
        </View>

        {/* --- MODIFIED: Editable Card --- */}
        <Card
          style={[styles.card, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <Card.Content>
            <List.Subheader>Editable Information</List.Subheader>
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="account-outline" />}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="email-outline" />}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {/* --- NEW: Added new editable fields --- */}
            <TextInput
              label="Class Year"
              value={classYear}
              onChangeText={setClassYear}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="school-outline" />}
            />
            <TextInput
              label="Semester"
              value={semester}
              onChangeText={setSemester}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="book-outline" />}
            />
            <TextInput
              label="Division"
              value={division}
              onChangeText={setDivision}
              mode="outlined"
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="google-classroom" />}
            />
            {/* --- END NEW --- */}
          </Card.Content>
        </Card>
        {/* --- END MODIFICATION --- */}

        {/* --- MODIFIED: Permanent Info Card --- */}
        <Card
          style={[styles.card, { backgroundColor: colors.surface }]}
          elevation={1}
        >
          <Card.Content>
            <List.Subheader>Permanent Information</List.Subheader>
            <List.Item
              title="Enrollment No."
              description={user?.enrollmentNo}
              left={() => <List.Icon icon="identifier" />}
            />
            {/* Removed Class Year and Semester */}
          </Card.Content>
        </Card>
        {/* --- END MODIFICATION --- */}

        {/* --- Save Button --- */}
        <Button
          mode="contained"
          onPress={handleUpdateProfile}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Save Changes
        </Button>
      </ScrollView>

      {/* --- Snackbars --- */}
      <Portal>
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
          duration={1500}
          style={{ backgroundColor: colors.primaryContainer }}
        >
          <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default EditProfileScreen;