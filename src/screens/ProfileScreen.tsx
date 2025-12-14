import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Animated, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import {
  Text,
  Button,
  Snackbar,
  useTheme,
  Avatar,
  List,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
  Switch,
  IconButton,
  Surface
} from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore, ThemeState } from '../store/useThemeStore';
import { TabParamList, RootStackParamList } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, G } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { attendance } from '../services/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = BottomTabScreenProps<TabParamList, 'Profile'>;
type CombinedNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// --- Donut Chart Component ---
const DonutChart = ({ percentage, radius = 45, strokeWidth = 8, color, bgColor }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * radius;
  const halfCircle = radius + strokeWidth;

  useEffect(() => {
    Animated.timing(animatedValue, { toValue: percentage, duration: 800, useNativeDriver: true }).start();
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: (radius + strokeWidth) * 2, height: (radius + strokeWidth) * 2, justifyContent: 'center', alignItems: 'center' }}>
      <Svg height={(radius + strokeWidth) * 2} width={(radius + strokeWidth) * 2} viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}>
        <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
          <Circle cx="50%" cy="50%" r={radius} stroke={bgColor} strokeWidth={strokeWidth} fill="transparent" />
          <AnimatedCircle cx="50%" cy="50%" r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </G>
      </Svg>
      <View style={styles.chartTextContainer}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color }}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Stat Box Component ---
const StatBox = ({ label, value, icon, color, bgColor }: any) => (
  <Surface style={[styles.statBox, { backgroundColor: bgColor }]} elevation={1}>
    <MaterialCommunityIcons name={icon} size={24} color={color} style={{ marginBottom: 4 }} />
    <Text variant="labelMedium" style={{ opacity: 0.7 }}>{label}</Text>
    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{value}</Text>
  </Surface>
);

const ProfileScreen = ({ navigation }: Props) => {
  const rootNavigation = navigation.getParent<CombinedNavigationProp>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const appTheme = useThemeStore((state) => state.theme);
  const setAppTheme = useThemeStore((state) => state.setTheme);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const { data: summary, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['attendanceSummary'],
    queryFn: attendance.getOverallSummary,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name: string = '') => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // --- Render Header ---
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        <Avatar.Text 
          size={84} 
          label={getInitials(user?.fullName)} 
          style={{ backgroundColor: colors.primaryContainer }} 
          labelStyle={{ color: colors.onPrimaryContainer, fontSize: 32 }} 
        />
        <IconButton
          icon="pencil"
          mode="contained"
          size={16}
          containerColor={colors.primary}
          iconColor={colors.onPrimary}
          style={styles.editIcon}
          onPress={() => rootNavigation.navigate('EditProfile')}
        />
      </View>
      <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginTop: 12, color: colors.onSurface }}>{user?.fullName}</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{user?.email}</Text>
      <Text variant="labelLarge" style={{ color: colors.primary, marginTop: 4 }}>{user?.enrollmentNo}</Text>
    </View>
  );

  // --- Render Stats ---
  const renderStats = () => (
    <View style={styles.statsRow}>
      <StatBox 
        label="Year" 
        value={user?.classYear || '-'} 
        icon="school-outline" 
        color={colors.primary} 
        bgColor={colors.elevation.level2} 
      />
      <StatBox 
        label="Semester" 
        value={user?.semester || '-'} 
        icon="book-open-variant" 
        color={colors.secondary} 
        bgColor={colors.elevation.level2} 
      />
      <StatBox 
        label="Division" 
        value={user?.division || '-'} 
        icon="google-classroom" 
        color={colors.tertiary} 
        bgColor={colors.elevation.level2} 
      />
    </View>
  );

  // --- Render Attendance Card ---
  const renderAttendance = () => (
    <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="contained">
      <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
        {isLoading ? (
          <ActivityIndicator style={{ flex: 1 }} />
        ) : summary ? (
          <>
            <DonutChart 
              percentage={summary.percentage} 
              color={summary.percentage > 75 ? colors.primary : colors.error} 
              bgColor={colors.surfaceVariant}
            />
            <View style={{ flex: 1, marginLeft: 24, gap: 12 }}>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Attendance Overview</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Total {summary.totalHeldSessions} Sessions</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Present</Text>
                  <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>{summary.totalAttendedSessions}</Text>
                </View>
                <View>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Absent</Text>
                  <Text variant="titleMedium" style={{ color: colors.error, fontWeight: 'bold' }}>{summary.totalMissedSessions}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <Text style={{ flex: 1, textAlign: 'center', color: colors.onSurfaceVariant }}>No data available</Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        <View style={[styles.topSection, { paddingTop: insets.top + 20 }]}>
          {renderHeader()}
          {renderStats()}
        </View>

        <View style={styles.contentSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Performance</Text>
          {renderAttendance()}

          <Text variant="titleMedium" style={styles.sectionTitle}>Settings</Text>
          <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="contained">
            <List.Section style={{ marginVertical: 0 }}>
              
              <List.Item
                title="Face Verification"
                description={user?.hasFaceImage ? "Registered & Verified" : "Not Registered"}
                left={props => <List.Icon {...props} icon="face-recognition" color={user?.hasFaceImage ? colors.primary : colors.error} />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => rootNavigation.navigate('UpdateFace')}
              />
              <Divider />
              <List.Item
                title="Change Password"
                left={props => <List.Icon {...props} icon="lock-outline" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => rootNavigation.navigate('ChangePassword')}
              />
              <Divider />
              
              <View style={{ padding: 16 }}>
                <Text variant="bodyMedium" style={{ marginBottom: 12 }}>App Theme</Text>
                <SegmentedButtons
                  value={appTheme}
                  onValueChange={(val) => setAppTheme(val as ThemeState)}
                  buttons={[
                    { value: 'light', label: 'Light', icon: 'weather-sunny' },
                    { value: 'system', label: 'Auto', icon: 'theme-light-dark' },
                    { value: 'dark', label: 'Dark', icon: 'weather-night' },
                  ]}
                  density="medium"
                />
              </View>
            </List.Section>
          </Card>

          <Button 
            mode="outlined" 
            textColor={colors.error} 
            style={{ borderColor: colors.error, marginTop: 12 }} 
            icon="logout"
            loading={isLoggingOut}
            onPress={handleLogout}
          >
            Logout
          </Button>

          <Text style={{ textAlign: 'center', marginTop: 24, color: colors.onSurfaceVariant, opacity: 0.5 }}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} style={{ backgroundColor: colors.errorContainer }}>
        <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  topSection: { alignItems: 'center', marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative' },
  editIcon: { position: 'absolute', bottom: -4, right: -4, margin: 0 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, width: '100%' },
  statBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  contentSection: { paddingHorizontal: 20 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12, marginTop: 12, opacity: 0.7 },
  card: { borderRadius: 16, marginBottom: 8, overflow: 'hidden' },
  chartTextContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
});

export default ProfileScreen;