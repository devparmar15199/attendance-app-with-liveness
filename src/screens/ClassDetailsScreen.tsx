import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, FlatList, Animated, RefreshControl, ScrollView, Dimensions } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Snackbar,
  useTheme,
  List,
  Button,
  Portal,
  Dialog,
  Avatar,
  Chip,
  SegmentedButtons,
  Menu,
  IconButton,
  Divider,
  ProgressBar
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, G } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList, AttendanceRecord } from '../types';
import { classes, attendance } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ClassDetails'>;

const { width } = Dimensions.get('window');

// --- Helper: Initials ---
const getInitials = (name: string = '') => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

// --- Component: Donut Chart ---
const DonutChart = ({ percentage = 0, radius = 60, strokeWidth = 12, color, bgColor }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * radius;
  const halfCircle = radius + strokeWidth;
  const safePercentage = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));

  useEffect(() => {
    Animated.timing(animatedValue, { toValue: safePercentage, duration: 1000, useNativeDriver: true }).start();
  }, [safePercentage]);

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
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color }}>{Math.round(safePercentage)}%</Text>
        <Text variant="labelSmall" style={{ color: 'gray' }}>Attendance</Text>
      </View>
    </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Component: Stat Box ---
const StatBox = ({ label, value, icon, color, style }: any) => (
  <View style={[styles.statBox, style]}>
    <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </View>
    <View>
      <Text variant="labelMedium" style={{ color: 'gray' }}>{label}</Text>
      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{value}</Text>
    </View>
  </View>
);

// --- Component: Projection Card ---
const ProjectionCard = ({ stats, threshold = 75, colors }: any) => {
  const { totalAttendedSessions: attended, totalHeldSessions: total } = stats;
  
  const getProjection = () => {
    const currentPct = (attended / (total || 1)) * 100;
    
    if (currentPct >= threshold) {
      // How many can I miss?
      // (attended) / (total + x) = 0.75
      const maxTotal = attended / (threshold / 100);
      const buffer = Math.floor(maxTotal - total);
      if (buffer <= 0) return { status: 'warning', msg: "You're right on the edge! Don't miss the next class." };
      return { status: 'safe', msg: `You can miss ${buffer} upcoming classes and stay above ${threshold}%.` };
    } else {
      // How many must I attend?
      // (attended + x) / (total + x) = 0.75
      // attended + x = 0.75*total + 0.75*x
      // 0.25*x = 0.75*total - attended
      // x = (0.75*total - attended) / 0.25
      const needed = Math.ceil(((threshold/100) * total - attended) / (1 - (threshold/100)));
      return { status: 'danger', msg: `You need to attend the next ${needed} classes consecutively to hit ${threshold}%.` };
    }
  };

  const projection = getProjection();
  const bg = projection.status === 'safe' ? colors.primaryContainer : projection.status === 'danger' ? colors.errorContainer : colors.secondaryContainer;
  const icon = projection.status === 'safe' ? 'shield-check' : projection.status === 'danger' ? 'alert-octagon' : 'alert';
  const iconColor = projection.status === 'safe' ? colors.primary : projection.status === 'danger' ? colors.error : colors.secondary;

  return (
    <Card style={[styles.projectionCard, { backgroundColor: bg }]} mode="contained">
      <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ fontWeight: 'bold', color: iconColor }}>Smart Analysis</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurface }}>{projection.msg}</Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const ClassDetailsScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { classId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [menuVisible, setMenuVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  
  // Data Fetching
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['classDetails', classId],
    queryFn: async () => {
      const [details, stats, recordsResponse] = await Promise.all([
        classes.getById(classId).catch(() => null),
        attendance.getClassSummary(classId).catch(() => null),
        attendance.getRecordsByClass(classId, 1, 50).catch(() => null),
      ]);
      return { 
        details, 
        stats: stats || { percentage: 0, totalAttendedSessions: 0, totalMissedSessions: 0, totalHeldSessions: 0 },
        records: recordsResponse?.data || [] 
      };
    },
  });

  const { details, stats, records } = data || {};

  // Dynamic Header Options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerTransparent: true,
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item onPress={() => { setMenuVisible(false); refetch(); }} title="Refresh Data" leadingIcon="refresh" />
          <Divider />
          <Menu.Item onPress={() => { setMenuVisible(false); setDialogVisible(true); }} title="Unenroll" titleStyle={{ color: colors.error }} leadingIcon="delete" />
        </Menu>
      ),
    });
  }, [navigation, menuVisible, colors]);

  const handleUnenroll = async () => {
    setIsUnenrolling(true);
    try {
      await classes.unenrollFromClass(classId);
      setDialogVisible(false);
      queryClient.invalidateQueries({ queryKey: ['enrolledClasses'] });
      navigation.goBack();
    } catch (err) {
      setIsUnenrolling(false);
    }
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => {
    const isPresent = item.livenessPassed || item.manualEntry;
    return (
      <List.Item
        title={new Date(item.timestamp).toDateString()}
        description={`${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${isPresent ? 'Verified' : 'Missed'}`}
        left={props => (
          <Avatar.Icon 
            {...props} 
            icon={isPresent ? "face-recognition" : "close"} 
            size={40} 
            style={{ backgroundColor: isPresent ? colors.primaryContainer : colors.errorContainer }} 
            color={isPresent ? colors.primary : colors.error}
          />
        )}
        right={props => (
          <View style={{ justifyContent: 'center' }}>
            <Chip 
              textStyle={{ fontSize: 10, lineHeight: 10 }} 
              style={{ backgroundColor: isPresent ? '#E8F5E9' : '#FFEBEE', height: 24 }}
              compact
            >
              {isPresent ? 'Present' : 'Absent'}
            </Chip>
          </View>
        )}
        style={[styles.historyItem, { backgroundColor: colors.surface }]}
      />
    );
  };

  const renderOverview = () => {
    if (!stats || !details) return null;
    const isHealthy = stats.percentage >= 75;

    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        
        {/* Main Chart Card */}
        <Card style={[styles.mainCard, { backgroundColor: colors.surface }]} mode="elevated">
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DonutChart 
                percentage={stats.percentage} 
                radius={55} 
                color={isHealthy ? colors.primary : colors.error} 
                bgColor={colors.surfaceVariant} 
              />
              <View style={{ flex: 1, paddingLeft: 24, gap: 12 }}>
                <StatBox label="Total Classes" value={stats.totalHeldSessions} icon="calendar-check" color={colors.onSurfaceVariant} />
                <StatBox label="Present" value={stats.totalAttendedSessions} icon="check-circle" color={colors.primary} />
                <StatBox label="Absent" value={stats.totalMissedSessions} icon="close-circle" color={colors.error} />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Projection / Advice */}
        <ProjectionCard stats={stats} colors={colors} />

        {/* Course Info */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Course Details</Text>
        <Card style={[styles.infoCard, { backgroundColor: colors.surface }]} mode="contained">
          <Card.Content style={{ gap: 16 }}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account-tie" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={{ color: 'gray' }}>Instructor</Text>
                <Text variant="bodyLarge">{details.teacherName}</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="barcode" size={20} color={colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={{ color: 'gray' }}>Subject Code</Text>
                <Text variant="bodyLarge">{details.subjectCode}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={{ color: 'gray' }}>Semester</Text>
                <Text variant="bodyLarge">{details.semester}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Hero Header */}
      <View style={[styles.header, { paddingTop: insets.top + 65, backgroundColor: colors.surface }]}>
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>{details?.subjectName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Chip icon="school" mode="outlined" compact style={{ marginRight: 8 }}>{details?.subjectCode}</Chip>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{details?.teacherName}</Text>
          </View>
        </View>
        
        <SegmentedButtons
          value={tab}
          onValueChange={val => setTab(val as 'overview' | 'history')}
          buttons={[
            { value: 'overview', label: 'Overview', icon: 'chart-pie' },
            { value: 'history', label: 'History', icon: 'history' },
          ]}
          style={{ paddingHorizontal: 20, marginBottom: 16 }}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {tab === 'overview' ? renderOverview() : (
          <FlatList
            data={records}
            keyExtractor={item => item._id}
            renderItem={renderAttendanceItem}
            contentContainerStyle={{ paddingVertical: 16 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          />
        )}
      </View>

      {/* Dialogs */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Unenroll from Class?</Dialog.Title>
          <Dialog.Content><Text>You will lose access to {details?.subjectName}. This cannot be undone.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleUnenroll} textColor={colors.error} loading={isUnenrolling}>Unenroll</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 0 },
  content: { flex: 1 },
  
  // Overview Styles
  mainCard: { borderRadius: 20, marginBottom: 16 },
  chartTextContainer: { position: 'absolute', alignItems: 'center' },
  statBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  
  projectionCard: { marginBottom: 24, borderRadius: 16 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12, opacity: 0.8 },
  infoCard: { borderRadius: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  // History Styles
  historyItem: { marginHorizontal: 20, marginBottom: 8, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});

export default ClassDetailsScreen;