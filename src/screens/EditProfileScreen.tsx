import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Snackbar,
  useTheme,
  Avatar,
  SegmentedButtons,
  HelperText,
  IconButton
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { users } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [classYear, setClassYear] = useState(user?.classYear || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [division, setDivision] = useState(user?.division || '');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const getInitials = (name: string = '') => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');

    if (!fullName.trim() || !email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await users.updateProfile({
        fullName,
        email,
        classYear,
        semester,
        division,
      });
      updateUser(updatedUser);
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigation.goBack(), 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Photo Edit Hint */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
           <View>
             <Avatar.Text 
               size={100} 
               label={getInitials(user?.fullName)} 
               style={{ backgroundColor: colors.primaryContainer }} 
               color={colors.primary}
               labelStyle={{ fontSize: 36 }}
             />
             <TouchableOpacity 
                style={[styles.cameraBadge, { backgroundColor: colors.inverseSurface }]}
                onPress={() => navigation.navigate('UpdateFace')}
             >
                <IconButton icon="camera" iconColor={colors.inverseOnSurface} size={20} />
             </TouchableOpacity>
           </View>
           <Text variant="titleLarge" style={{ marginTop: 16, fontWeight: 'bold' }}>Edit Profile</Text>
        </View>

        <View style={styles.formContainer}>
          
          {/* Section: Personal Info */}
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: colors.primary }]}>Personal Details</Text>
          <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <TextInput
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                left={<TextInput.Icon icon="account" />}
                disabled={loading}
              />
              <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email" />}
                disabled={loading}
              />
              <TextInput
                label="Enrollment ID (Read Only)"
                value={user?.enrollmentNo}
                mode="outlined"
                disabled={true}
                style={{ backgroundColor: colors.surfaceDisabled }}
                left={<TextInput.Icon icon="identifier" />}
              />
            </Card.Content>
          </Card>

          {/* Section: Academic Info */}
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: colors.primary, marginTop: 24 }]}>Academic Information</Text>
          <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="contained">
            <Card.Content style={{ gap: 16 }}>
              
              <View>
                <Text variant="labelMedium" style={{ marginBottom: 8, color: colors.onSurfaceVariant }}>Class Year</Text>
                <SegmentedButtons
                  value={classYear}
                  onValueChange={setClassYear}
                  buttons={[
                    { value: '1', label: '1st' },
                    { value: '2', label: '2nd' },
                    { value: '3', label: '3rd' },
                    { value: '4', label: '4th' },
                  ]}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  label="Semester"
                  value={semester}
                  onChangeText={setSemester}
                  mode="outlined"
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                  left={<TextInput.Icon icon="book-open-variant" />}
                  disabled={loading}
                />
                <TextInput
                  label="Division"
                  value={division}
                  onChangeText={setDivision}
                  mode="outlined"
                  style={{ flex: 1 }}
                  left={<TextInput.Icon icon="google-classroom" />}
                  disabled={loading}
                />
              </View>
            </Card.Content>
          </Card>

          <Button 
            mode="contained" 
            onPress={handleUpdateProfile} 
            loading={loading}
            style={{ marginTop: 32 }}
            contentStyle={{ paddingVertical: 6 }}
          >
            Save Changes
          </Button>

        </View>
      </ScrollView>

      {/* Feedback */}
      <Snackbar visible={!!error} onDismiss={() => setError('')} style={{ backgroundColor: colors.errorContainer }}>
        <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
      </Snackbar>
      <Snackbar visible={!!success} onDismiss={() => setSuccess('')} style={{ backgroundColor: colors.primaryContainer }}>
        <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 20 },
  cameraBadge: { position: 'absolute', bottom: -4, right: -4, borderRadius: 24, padding: 0, margin: 0, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  formContainer: { paddingHorizontal: 20 },
  sectionLabel: { marginBottom: 8, fontWeight: 'bold', marginLeft: 4 },
  card: { borderRadius: 12 },
});

export default EditProfileScreen;