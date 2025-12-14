import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import {
  Text,
  Button,
  Snackbar,
  useTheme,
  Avatar,
  List,
  Card,
  SegmentedButtons,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore, ThemeState } from '../store/useThemeStore';
import { TabParamList, RootStackParamList, AttendanceSummary } from '../types';
import ScreenContainer from '../components/common/ScreenContainer';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, G } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { attendance } from '../services/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = BottomTabScreenProps<TabParamList, 'Profile'>;
type CombinedNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DonutChart = ({
  percentage,
  radius = 60,
  strokeWidth = 12,
  color,
}: {
  percentage: number;
  radius?: number;
  strokeWidth?: number;
  color: string;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * radius;
  const halfCircle = radius + strokeWidth;

  const animation = (toValue: number) => {
    return Animated.timing(animatedValue, {
      toValue,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animation(percentage);
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: radius * 2, height: radius * 2 }}>
      <Svg
        height={radius * 2}
        width={radius * 2}
        viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}
      >
        <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
          <Circle
            cx="50%"
            cy="50%"
            stroke={color}
            strokeOpacity={0.2} // Background for the chart
            strokeWidth={strokeWidth}
            r={radius}
            fill="transparent"
          />
          <AnimatedCircle
            cx="50%"
            cy="50%"
            stroke={color}
            strokeWidth={strokeWidth}
            r={radius}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.chartTextContainer}>
        <Text style={styles.chartPercent} variant="headlineSmall">
          {`${Math.round(percentage)}%`}
        </Text>
      </View>
    </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProfileScreen = ({ navigation }: Props) => {
  const rootNavigation = navigation.getParent<CombinedNavigationProp>();
  const { colors } = useTheme();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const appTheme = useThemeStore((state) => state.theme);
  const setAppTheme = useThemeStore((state) => state.setTheme);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const { data: attendanceSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['attendanceSummary'],
    queryFn: attendance.getOverallSummary,
  });

  const handleLogout = async () => {
    setError('');
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err: any) {
      setError(err.message || 'Failed to log out');
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // --- ADDED: Helper to render quick info chips ---
  const renderQuickInfo = () => (
    <View style={styles.quickInfoContainer}>
      <Chip icon="school-outline" style={styles.chip} mode="flat">
        Year: {user?.classYear}
      </Chip>
      <Chip icon="book-outline" style={styles.chip} mode="flat">
        Semester: {user?.semester}
      </Chip>
      <Chip icon="division" style={styles.chip} mode="flat">
        Division: {user?.division}
      </Chip>
      <Chip
        icon={user?.hasFaceImage ? 'face-recognition' : 'alert-circle-outline'}
        style={[
          styles.chip,
          {
            backgroundColor: user?.hasFaceImage
              ? colors.primaryContainer
              : colors.errorContainer,
          },
        ]}
        textStyle={{
          color: user?.hasFaceImage
            ? colors.onPrimaryContainer
            : colors.onErrorContainer,
        }}
        mode="flat"
      >
        Face {user?.hasFaceImage ? 'Verified' : 'Missing'}
      </Chip>
    </View>
  );

  // --- ADDED: Helper to render attendance widget ---
  const renderAttendanceOverview = () => (
    <Card style={styles.card} elevation={1}>
      <List.Section>
        <List.Subheader style={{ color: colors.primary }}>
          Overall Attendance
        </List.Subheader>
        <Card.Content>
          {isLoadingSummary ? (
            <ActivityIndicator style={styles.loader} />
          ) : attendanceSummary ? (
            <View style={styles.overviewContent}>
              <DonutChart
                percentage={attendanceSummary.percentage}
                color={
                  attendanceSummary.percentage > 75
                    ? colors.primary
                    : colors.error
                }
              />
              <View style={styles.statsBreakdown}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="check-all"
                    size={24}
                    color={colors.primary}
                  />
                  <View style={styles.statText}>
                    <Text variant="bodySmall" style={{ color: colors.primary }}>
                      Present
                    </Text>
                    <Text variant="titleMedium">
                      {attendanceSummary.totalAttendedSessions}
                    </Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={24}
                    color={colors.error}
                  />
                  <View style={styles.statText}>
                    <Text variant="bodySmall" style={{ color: colors.error }}>
                      Absent
                    </Text>
                    <Text variant="titleMedium">
                      {attendanceSummary.totalMissedSessions}
                    </Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="format-list-numbered"
                    size={24}
                    color={colors.onSurfaceVariant}
                  />
                  <View style={styles.statText}>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      Total
                    </Text>
                    <Text variant="titleMedium">
                      {attendanceSummary.totalHeldSessions}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <Text
              style={{
                color: colors.onSurfaceVariant,
                textAlign: 'center',
                paddingVertical: 20,
              }}
            >
              No attendance data yet.
            </Text>
          )}
        </Card.Content>
      </List.Section>
    </Card>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* --- HEADER --- */}
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
            style={[styles.role, { color: colors.onSurfaceVariant }]}
            variant="titleMedium"
          >
            Student
          </Text>
        </View>

        {/* --- NEW: QUICK INFO CHIPS --- */}
        {renderQuickInfo()}

        {/* --- NEW: ATTENDANCE WIDGET --- */}
        {renderAttendanceOverview()}

        {/* --- STUDENT INFO CARD --- */}
        <Card style={styles.card} elevation={1}>
          <List.Section>
            <List.Subheader style={{ color: colors.primary }}>
              Student Information
            </List.Subheader>
            <List.Item
              title="Enrollment No."
              description={user?.enrollmentNo || 'N/A'}
              left={() => <List.Icon icon="account-outline" />}
            />
            <List.Item
              title="Email"
              description={user?.email || 'N/A'}
              left={() => <List.Icon icon="email-outline" />}
            />
            <List.Item
              title="Edit Profile"
              description="Update your name or email"
              left={() => <List.Icon icon="account-edit-outline" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => rootNavigation.navigate('EditProfile')}
            />
          </List.Section>
        </Card>

        {/* --- ATTENDANCE ACTIONS CARD --- */}
        <Card style={styles.card} elevation={1}>
          <List.Section>
            <List.Subheader style={{ color: colors.primary }}>
              Attendance Actions
            </List.Subheader>
            <List.Item
              title="View All Classes"
              description="See class details and unenroll"
              left={() => <List.Icon icon="school-outline" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => navigation.navigate('Classes')}
            />
          </List.Section>
        </Card>

        {/* --- SETTINGS CARD --- */}
        <Card style={styles.card} elevation={1}>
          <List.Section>
            <List.Subheader style={{ color: colors.primary }}>
              Settings & Security
            </List.Subheader>
            <List.Item
              title="Change Password"
              description="Update your account security"
              left={() => <List.Icon icon="lock-outline" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => rootNavigation.navigate('ChangePassword')}
            />
            <List.Item
              title="Update Face Image"
              description="Retake your verification photo"
              left={() => <List.Icon icon="camera-account" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() =>
                rootNavigation.navigate('UpdateFace')
              }
            />
          </List.Section>
        </Card>

        {/* --- APPEARANCE CARD --- */}
        <Card style={styles.card} elevation={1}>
          <List.Section>
            <List.Subheader style={{ color: colors.primary }}>
              Appearance
            </List.Subheader>
            <View style={styles.segmentedButtonContainer}>
              <SegmentedButtons
                value={appTheme}
                onValueChange={(value) => setAppTheme(value as ThemeState)}
                buttons={[
                  {
                    value: 'light',
                    label: 'Light',
                    icon: 'weather-sunny',
                  },
                  {
                    value: 'system',
                    label: 'System',
                    icon: 'theme-light-dark',
                  },
                  {
                    value: 'dark',
                    label: 'Dark',
                    icon: 'weather-night',
                  },
                ]}
              />
            </View>
          </List.Section>
        </Card>

        {/* --- LOGOUT BUTTON --- */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            loading={isLoggingOut}
            disabled={isLoggingOut}
            buttonColor={colors.error}
            textColor={colors.onError}
            style={styles.logoutButton}
            icon="logout-variant"
            contentStyle={styles.buttonContent}
          >
            Logout
          </Button>
        </View>
      </View>
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
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24, // Increased spacing
    marginTop: 10,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  role: {
    textTransform: 'capitalize',
    marginTop: 4,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    padding: 12,
  },
  chip: {
  },
  loader: {
    padding: 20,
  },
  overviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chartTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPercent: {
    fontWeight: 'bold',
  },
  statsBreakdown: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statText: {
    marginLeft: 12,
  },
  card: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  footer: {
    marginBottom: 16,
    marginTop: 24,
  },
  logoutButton: {},
  buttonContent: {
    paddingVertical: 8,
  },
  segmentedButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default ProfileScreen;