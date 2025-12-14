import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, ScrollView, RefreshControl, Dimensions } from 'react-native';
import {
  Text,
  Card,
  List,
  useTheme,
  ActivityIndicator,
  TouchableRipple,
  Avatar,
  IconButton,
  Button
} from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../store/useAuthStore';
import { useClassStore } from '../store/useClassStore';
import { TabParamList, RootStackParamList } from '../types';
import { attendance, qr, classes } from '../services/api';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

// --- Sub-components for Cleaner Code ---

const QuickActionCard = ({ icon, label, color, onPress, badge }: any) => (
  <Card style={styles.actionCard} onPress={onPress} mode="outlined">
    <View style={styles.actionContent}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text variant="labelMedium" style={{ marginTop: 8, fontWeight: '600' }}>{label}</Text>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  </Card>
);

const StatRow = ({ label, value, color }: any) => (
  <View style={styles.statRow}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="bodyMedium" style={{ color: '#666', marginLeft: 8 }}>{label}</Text>
    </View>
    <Text variant="titleMedium" style={{ fontWeight: 'bold', color }}>{value}</Text>
  </View>
);

// --- 1. Enhanced Donut Chart ---
const DonutChart = ({
  percentage,
  radius = 55,
  strokeWidth = 10,
  color,
  bgColor
}: {
  percentage: number;
  radius?: number;
  strokeWidth?: number;
  color: string;
  bgColor: string;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * radius;
  const halfCircle = radius + strokeWidth;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1000, // Slower, smoother animation
      useNativeDriver: true,
    }).start();
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: (radius + strokeWidth) * 2, height: (radius + strokeWidth) * 2, justifyContent: 'center', alignItems: 'center' }}>
      <Svg
        height={(radius + strokeWidth) * 2}
        width={(radius + strokeWidth) * 2}
        viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}
      >
        <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
          {/* Background Circle */}
          <Circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <AnimatedCircle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.chartTextContainer}>
        <Text style={{ fontWeight: 'bold', color }} variant="titleLarge">
          {`${Math.round(percentage)}%`}
        </Text>
      </View>
    </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Main Home Screen ---
const HomeScreen = ({ navigation }: Props) => {
  const user = useAuthStore((state) => state.user);

  const {
    enrolledClasses,
    fetchEnrolledClasses,
    isLoading: isLoadingClasses
  } = useClassStore();

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation for entering content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // --- Data Fetching ---

  // 1. Attendance Summary
  const {
    data: attendanceSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery({
    queryKey: ['attendanceSummary'],
    queryFn: attendance.getOverallSummary,
    staleTime: 1000 * 60 * 5,
  });

  // 2. Active Sessions (Polling)
  const {
    data: activeSessions,
    refetch: refetchActiveSessions,
    isRefetching: isRefetchingActiveSessions,
  } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: qr.getActiveSessions,
    refetchInterval: 60 * 1000,
  });

  // 3. Recent Activity (New Feature for "Details")
  const {
    data: recentActivity,
    refetch: refetchActivity,
    isLoading: isLoadingActivity
  } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: () => attendance.getMyRecords(1, 3), // Fetch top 3 records
  });

  // Initial Load & Animation
  useEffect(() => {
    fetchEnrolledClasses();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // --- Pull-to-Refresh Handler ---
  const onRefresh = useCallback(async () => {
    await Promise.all([
      refetchSummary(),
      refetchActiveSessions(),
      refetchActivity(),
      fetchEnrolledClasses(true),
    ]);
  }, []);

  const isRefreshing =
    (isRefetchingSummary && !isLoadingSummary) ||
    isRefetchingActiveSessions ||
    isLoadingClasses;

  // --- Helpers ---
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFirstName = () => user?.fullName.split(' ')[0] || 'Student';

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <Text
          style={{ color: colors.onSurfaceVariant }}
          variant="headlineSmall"
        >
          {getGreeting()},
        </Text>
        <Text
          style={{ fontWeight: 'bold', color: colors.onSurface }}
          variant="headlineMedium"
        >
          {getFirstName()}!
        </Text>
      </View>
      <TouchableRipple
        onPress={() => navigation.navigate('Profile')}
        style={styles.profileIcon}
        borderless
      >
        <Avatar.Text size={45} label={getFirstName()[0]} style={{ backgroundColor: colors.primaryContainer }} color={colors.primary} />
      </TouchableRipple>
    </View>
  );

  const renderActiveSession = () => {
    if (!activeSessions || activeSessions.length === 0) return null;
    const session = activeSessions[0];

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Card
          style={[styles.activeCard, { backgroundColor: colors.errorContainer }]} // Red/Alert color for urgency
          onPress={() => navigation.navigate('Scan')}
          mode="contained"
        >
          <Card.Content style={styles.activeCardContent}>
            <View style={{ flex: 1 }}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>LIVE CLASS</Text>
              </View>
              <Text variant="titleMedium" style={{ color: colors.onErrorContainer, fontWeight: 'bold', marginTop: 4 }}>
                {session.classId.subjectName}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onErrorContainer }}>
                Mark attendance before it expires
              </Text>
            </View>
            <Button 
              mode="contained" 
              compact 
              buttonColor={colors.error} 
              textColor="#fff"
              icon="qrcode-scan"
              onPress={() => navigation.navigate('Scan')}
            >
              Scan
            </Button>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.sectionContainer}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionGrid}>
        <QuickActionCard 
          icon="qr-code-outline" 
          label="Scan" 
          color={colors.primary} 
          onPress={() => navigation.navigate('Scan')} 
        />
        <QuickActionCard 
          icon="school-outline" 
          label="Classes" 
          color={colors.secondary} 
          onPress={() => navigation.navigate('Classes')} 
          badge={enrolledClasses.length}
        />
        <QuickActionCard 
          icon="person-outline" 
          label="Profile" 
          color={colors.tertiary} 
          onPress={() => navigation.navigate('Profile')} 
        />
      </View>
    </View>
  );

  const renderOverview = () => (
    <View style={styles.sectionContainer}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Attendance Overview</Text>
      <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="elevated">
        <Card.Content>
          {isLoadingSummary ? (
            <ActivityIndicator animating color={colors.primary} style={{ padding: 20 }} />
          ) : attendanceSummary ? (
            <View style={styles.overviewRow}>
              {/* Donut Chart */}
              <DonutChart
                percentage={attendanceSummary.percentage}
                color={attendanceSummary.percentage >= 75 ? colors.primary : colors.error}
                bgColor={colors.surfaceVariant}
              />
              
              {/* Stats Column */}
              <View style={styles.statsColumn}>
                <StatRow label="Present" value={attendanceSummary.totalAttendedSessions} color={colors.primary} />
                <StatRow label="Absent" value={attendanceSummary.totalMissedSessions} color={colors.error} />
                <StatRow label="Total" value={attendanceSummary.totalHeldSessions} color={colors.onSurface} />
              </View>
            </View>
          ) : (
             <Text style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>No data available</Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={[styles.sectionContainer, { marginBottom: 100 }]}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Recent Activity</Text>
      {isLoadingActivity ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : recentActivity?.data && recentActivity.data.length > 0 ? (
        recentActivity.data.map((record: any) => (
          <List.Item
            key={record._id}
            title={record.classId.subjectName}
            description={new Date(record.timestamp).toDateString()}
            left={props => (
              <List.Icon {...props} icon="check-circle" color={colors.primary} />
            )}
            style={[styles.activityItem, { backgroundColor: colors.surface }]}
            titleStyle={{ fontWeight: '600' }}
          />
        ))
      ) : (
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 10 }}>No recent attendance records.</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {renderHeader()}
        
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {renderActiveSession()}
          {renderQuickActions()}
          {renderOverview()}
          {renderRecentActivity()}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24
  },
  profileIcon: { 
    padding: 4, 
    borderRadius: 30 
  },
  
  // Active Card
  activeCard: { marginBottom: 24, overflow: 'hidden' },
  activeCardContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  liveBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#B00020', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 4, 
    marginBottom: 4 
  },
  liveDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: '#fff', 
    marginRight: 6 
  },

  // Sections
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12, opacity: 0.8 },
  
  // Quick Actions
  quickActionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: { 
    width: '31%', 
    borderRadius: 12, 
    backgroundColor: 'transparent', 
    borderColor: 'rgba(0,0,0,0.05)' 
  },
  actionContent: { alignItems: 'center', padding: 12 },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  badge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: '#B00020', 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Overview
  card: { borderRadius: 16 },
  overviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  chartTextContainer: { position: 'absolute' },
  statsColumn: { flex: 1, paddingLeft: 32, gap: 12 },
  statRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%' 
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Recent Activity
  activityItem: { borderRadius: 12, marginBottom: 8 },
});

export default HomeScreen;