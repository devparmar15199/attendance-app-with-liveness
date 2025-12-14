import React, { useState, useEffect, useCallback, useRef } from 'react';

import { StyleSheet, View, FlatList, Animated, RefreshControl } from 'react-native';

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

} from 'react-native-paper';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Svg, { Circle, G } from 'react-native-svg';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import {

  EnrolledClass,

  AttendanceRecord,

  AttendanceSummary,

  RootStackParamList,

} from '../types';

import { classes, attendance } from '../services/api';



type Props = NativeStackScreenProps<RootStackParamList, 'ClassDetails'>;



// --- Helper to get initials for Avatar ---

const getInitials = (name: string = '') => {

  return name

    .split(' ')

    .map((n) => n[0])

    .join('')

    .toUpperCase();

};



// --- ADDED: Donut Chart Component ---

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

          {/* Background Circle */}

          <Circle

            cx="50%"

            cy="50%"

            stroke="#e6e7e8"

            strokeWidth={strokeWidth}

            r={radius}

            fill="transparent"

          />

          {/* Progress Circle */}

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

      {/* Percentage Text */}

      <View style={styles.chartTextContainer}>

        <Text style={styles.chartPercent} variant="headlineSmall">

          {`${Math.round(percentage)}%`}

        </Text>

      </View>

    </View>

  );

};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);



const ClassDetailsScreen = ({ route, navigation }: Props) => {

  const { colors } = useTheme();

  const { classId } = route.params;

  const insets = useSafeAreaInsets();

  const queryClient = useQueryClient();



  const [dialogVisible, setDialogVisible] = useState(false);

  const [isUnenrolling, setIsUnenrolling] = useState(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });



  // --- UPDATED: Use useQuery to fetch all data in parallel ---

  const {

    data,

    isLoading,

    isError,

    error,

    refetch,

    isRefetching,

  } = useQuery({

    queryKey: ['classDetails', classId],

    queryFn: async () => {

      const [details, stats, recordsResponse] = await Promise.all([

        classes.getById(classId),

        attendance.getClassSummary(classId),

        attendance.getRecordsByClass(classId, 1, 50),

      ]);

      return {

        details,

        stats,

        records: recordsResponse.data,

      };

    },

  });



  const { details, stats, records } = data || {};



  // Set navigation title when details are loaded

  useEffect(() => {

    if (details?.subjectName) {

      navigation.setOptions({ title: details.subjectName });

    }

  }, [details, navigation]);



  const handleUnenroll = async () => {

    setIsUnenrolling(true);

    setSnackbar({ visible: false, message: '' });

    try {

      await classes.unenrollFromClass(classId);

      setDialogVisible(false);

      // Invalidate queries so classes screen updates

      queryClient.invalidateQueries({ queryKey: ['enrolledClasses'] });

      queryClient.invalidateQueries({ queryKey: ['availableClasses'] });

      navigation.goBack();

    } catch (err: any) {

      setSnackbar({

        visible: true,

        message: err.message || 'Failed to unenroll.',

      });

    } finally {

      setIsUnenrolling(false);

    }

  };



  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => {

    const status = item.livenessPassed || item.manualEntry ? 'present' : 'absent';

    const statusColor = status === 'present' ? colors.primary : colors.error;

    const statusIcon =

      status === 'present' ? 'check-circle-outline' : 'close-circle-outline';



    return (

      <List.Item

        title={`Date: ${new Date(item.timestamp).toLocaleDateString()}`}

        description={`Status: ${status}`}

        titleStyle={{ color: colors.onSurface }}

        descriptionStyle={{

          color: statusColor,

          textTransform: 'capitalize',

        }}

        left={() => <List.Icon icon={statusIcon} color={statusColor} />}

        style={styles.historyItem}

      />

    );

  };



  // --- ADDED: Header Component for the FlatList ---

  const renderHeader = () => {

    if (isLoading || !details) {

      return null; // Loader is handled by full-screen state

    }



    return (

      <View style={styles.headerContainer}>

        {/* --- ADDED: New "Hero" Block --- */}

        <View

          style={[

            styles.heroContainer,

            { backgroundColor: colors.primaryContainer },

          ]}

        >

          <Avatar.Text

            size={56}

            label={getInitials(details.teacherName)}

            style={{ backgroundColor: colors.primary, marginBottom: 16 }}

            color={colors.onPrimary}

          />

          <Text

            variant="headlineLarge"

            style={[styles.heroTitle, { color: colors.onPrimaryContainer }]}

          >

            {details.subjectName}

          </Text>

          <Text

            variant="titleMedium"

            style={[styles.heroSubtitle, { color: colors.onPrimaryContainer }]}

          >

            {details.teacherName}

          </Text>

          <View style={styles.chipContainer}>

            <Chip icon="barcode" mode="flat" style={styles.heroChip}>

              {details.subjectCode}

            </Chip>

            <Chip icon="calendar-text" mode="flat" style={styles.heroChip}>

              Sem: {details.semester}

            </Chip>

          </View>

        </View>



        {/* --- Attendance Overview Card --- */}

        {stats && (

          <Card style={styles.detailsCard} elevation={1}>

            <Card.Title

              title="Attendance Overview"

              titleVariant="titleLarge"

            />

            <Card.Content style={styles.overviewContent}>

              <DonutChart

                percentage={stats.percentage}

                color={stats.percentage > 75 ? colors.primary : colors.error}

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

                      {stats.totalAttendedSessions}

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

                      {stats.totalMissedSessions}

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

                      {stats.totalHeldSessions}

                    </Text>

                  </View>

                </View>

              </View>

            </Card.Content>

          </Card>

        )}



        {/* --- Danger Zone Card --- */}

        <Card style={styles.detailsCard} elevation={1}>

          <Card.Title

            title="Danger Zone"

            titleVariant="titleLarge"

            titleStyle={{ color: colors.error }}

          />

          <List.Item

            title="Unenroll from Class"

            description="This action cannot be undone"

            titleStyle={{ color: colors.error }}

            left={() => (

              <List.Icon icon="alert-circle-outline" color={colors.error} />

            )}

            onPress={() => setDialogVisible(true)}

          />

        </Card>



        {/* --- History Subheader --- */}

        <List.Subheader>Attendance History</List.Subheader>

      </View>

    );

  };



  // --- ADDED: Empty component for the list ---

  const renderEmptyHistory = () => {

    if (isLoading) return null;

    return (

      <View style={styles.emptyContainer}>

        <Text style={{ color: colors.onSurfaceVariant }}>

          No attendance records found for this class.

        </Text>

      </View>

    );

  };



  if (isLoading && !isRefetching) {

    return (

      <View

        style={[styles.loadingContainer, { backgroundColor: colors.background }]}

      >

        <ActivityIndicator size="large" />

      </View>

    );

  }



  if (isError && !details) {

    return (

      <View

        style={[styles.errorContainer, { backgroundColor: colors.background }]}

      >

        <Text style={[styles.errorText, { color: colors.error }]}>

          {error?.message || 'Class details not found.'}

        </Text>

        <Button icon="refresh" mode="contained" onPress={() => refetch()}>

          Try Again

        </Button>

      </View>

    );

  }



  return (

    <View style={[styles.container, { backgroundColor: colors.elevation.level1 }]}>

      <FlatList

        data={records}

        renderItem={renderAttendanceItem}

        keyExtractor={(item) => item._id}

        ListHeaderComponent={renderHeader}

        ListEmptyComponent={renderEmptyHistory}

        contentContainerStyle={{

          paddingBottom: insets.bottom + 20,

        }}

        refreshControl={

          <RefreshControl

            refreshing={isRefetching}

            onRefresh={refetch}

            tintColor={colors.primary}

          />

        }

      />



      <Portal>

        <Dialog

          visible={dialogVisible}

          onDismiss={() => setDialogVisible(false)}

        >

          <Dialog.Title>Unenroll from {details?.subjectName}?</Dialog.Title>

          <Dialog.Content>

            <Text variant="bodyMedium">

              Are you sure you want to unenroll from this class? This action

              cannot be undone.

            </Text>

          </Dialog.Content>

          <Dialog.Actions>

            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>

            <Button

              onPress={handleUnenroll}

              textColor={colors.error}

              loading={isUnenrolling}

              disabled={isUnenrolling}

            >

              Unenroll

            </Button>

          </Dialog.Actions>

        </Dialog>

      </Portal>



      <Portal>

        <Snackbar

          visible={snackbar.visible}

          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}

          duration={4000}

          style={{ backgroundColor: colors.errorContainer }}

        >

          <Text style={{ color: colors.onErrorContainer }}>

            {snackbar.message}

          </Text>

        </Snackbar>

      </Portal>

    </View>

  );

};



const styles = StyleSheet.create({

  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

  },

  errorContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    padding: 24,

  },

  errorText: {

    fontSize: 16,

    textAlign: 'center',

    marginBottom: 20,

  },

  container: {

    flex: 1,

  },

  headerContainer: {

    paddingBottom: 8, // Space before the list starts

  },

  // --- ADDED: New Hero Block Styles ---

  heroContainer: {

    padding: 24,

    paddingTop: 16,

    marginBottom: 20,

  },

  heroTitle: {

    fontWeight: 'bold',

  },

  heroSubtitle: {

    opacity: 0.8,

    marginBottom: 16,

  },

  chipContainer: {

    flexDirection: 'row',

    gap: 8,

  },

  heroChip: {},

  detailsCard: {

    marginBottom: 20,

    marginHorizontal: 16,

    paddingHorizontal: 12,

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

  historyItem: {

    backgroundColor: 'white', // Give items a background

    marginHorizontal: 16, // Match card padding

  },

  emptyContainer: {

    alignItems: 'center',

    padding: 20,

  },

});



export default ClassDetailsScreen;