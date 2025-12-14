import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, FlatList, Pressable, RefreshControl, Animated } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Button,
  SegmentedButtons,
  Portal,
  List,
  Avatar,
  Chip,
  Searchbar,
  Snackbar,
  IconButton
} from 'react-native-paper';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueries, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useClassStore } from '../store/useClassStore';
import { classes } from '../services/api';
import {
  EnrolledClass,
  AvailableClass,
  TabParamList,
  RootStackParamList,
} from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Classes'>,
  NativeStackScreenProps<RootStackParamList>
>;

const getInitials = (name: string = '') => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

// --- 1. Enhanced Enrolled Card (Ticket Style) ---
const StudentClassCard = ({ classItem, onNavigate }: { classItem: EnrolledClass; onNavigate: () => void }) => {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onNavigate} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Card style={[styles.card, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.primary }]} mode="elevated">
        <Card.Content style={styles.cardContentRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.onSurface }}>{classItem.subjectName}</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>{classItem.teacherName}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip icon="barcode" textStyle={{ fontSize: 10, lineHeight: 10 }} style={{ height: 24 }} compact>{classItem.subjectCode}</Chip>
              <Chip icon="calendar" textStyle={{ fontSize: 10, lineHeight: 10 }} style={{ height: 24 }} compact>Sem {classItem.semester}</Chip>
            </View>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingLeft: 10 }}>
            <Avatar.Text size={40} label={getInitials(classItem.teacherName)} style={{ backgroundColor: colors.primaryContainer }} color={colors.primary} />
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.outline} style={{ marginTop: 8 }} />
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
};

// --- 2. Enhanced Available Card ---
const AvailableClassCard = ({ classItem, onEnroll, isEnrolling }: { classItem: AvailableClass; onEnroll: (id: string) => void; isEnrolling: boolean }) => {
  const { colors } = useTheme();
  return (
    <Card style={[styles.card, { backgroundColor: colors.surfaceVariant }]} mode="outlined">
      <Card.Content>
        <View style={styles.cardContentRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{classItem.subjectName}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>{classItem.teacher.fullName}</Text>
          </View>
          <Button
            mode="contained"
            compact
            onPress={() => onEnroll(classItem._id)}
            loading={isEnrolling}
            disabled={isEnrolling}
            icon="plus"
          >
            Join
          </Button>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Text variant="labelSmall" style={{ color: colors.outline }}>{classItem.subjectCode}</Text>
          <Text variant="labelSmall" style={{ color: colors.outline }}>•</Text>
          <Text variant="labelSmall" style={{ color: colors.outline }}>Sem {classItem.semester}</Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const ClassesScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('enrolled');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // 1. Use Store for Enrolled (Cached)
  const {
    enrolledClasses,
    fetchEnrolledClasses,
    isLoading: isStoreLoading
  } = useClassStore();

  const {
    data: availableClasses,
    refetch: refetchAvailable,
    isLoading: isAvailableLoading,
    isRefetching: isAvailableRefetching
  } = useQuery({
    queryKey: ['availableClasses'],
    queryFn: classes.getAvailable,
    enabled: tab === 'available', // Only fetch when tab is active
  });

  useEffect(() => {
    // Initial fetch if store is empty
    if (tab === 'enrolled') fetchEnrolledClasses();
  }, [tab]);

  const enrollMutation = useMutation({
    mutationFn: classes.enrollInClass,
    onSuccess: () => {
      setSnackbar({ visible: true, message: 'Enrolled successfully!' });
      // Refresh both lists
      fetchEnrolledClasses(true);
      queryClient.invalidateQueries({ queryKey: ['availableClasses'] });
      setTab('enrolled');
    },
    onError: (err: any) => setSnackbar({ visible: true, message: err.message || 'Enrollment failed.' }),
  });

  const onRefresh = useCallback(async () => {
    if (tab === 'enrolled') await fetchEnrolledClasses(true);
    else await refetchAvailable();
  }, [tab]);

  // --- Filtering ---
  const filteredData = useMemo(() => {
    const data = tab === 'enrolled' ? enrolledClasses : (availableClasses || []);
    if (!searchQuery) return data;

    return data.filter((item: any) =>
      item.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tab, enrolledClasses, availableClasses, searchQuery]);

  const isLoading = tab === 'enrolled' ? isStoreLoading : isAvailableLoading;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text variant="displaySmall" style={[styles.title, { color: colors.onSurface }]}>Classes</Text>

      <Searchbar
        placeholder={tab === 'enrolled' ? "Search my classes..." : "Find new classes..."}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchBar, { backgroundColor: colors.elevation.level2 }]}
        inputStyle={{ minHeight: 0 }} // Fix for paper searchbar height
      />

      <SegmentedButtons
        value={tab}
        onValueChange={(val) => { setTab(val); setSearchQuery(''); }}
        buttons={[
          { value: 'enrolled', label: 'My Classes', icon: 'school' },
          { value: 'available', label: 'Available', icon: 'magnify' },
        ]}
        style={styles.segmentedButtons}
      />
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null; // Skeleton handled elsewhere or loading spinner
    const msg = searchQuery
      ? "No classes match your search."
      : tab === 'enrolled'
        ? "You haven't enrolled in any classes."
        : "No classes available.";

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name={"notebook-off-outline" as any} size={64} color={colors.outline} />
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 16 }}>{msg}</Text>
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            {tab === 'enrolled' ? (
              <StudentClassCard classItem={item as EnrolledClass} onNavigate={() => navigation.navigate('ClassDetails', { classId: item._id })} />
            ) : (
              <AvailableClassCard classItem={item as AvailableClass} onEnroll={enrollMutation.mutate} isEnrolling={enrollMutation.isPending} />
            )}
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: 100
        }}
        refreshControl={
          <RefreshControl
            refreshing={tab === 'enrolled' ? false : isAvailableRefetching}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      />

      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          action={{ label: 'Close', onPress: () => setSnackbar({ ...snackbar, visible: false }) }}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 16,
    borderRadius: 12,
    height: 46,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  itemContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
});

export default ClassesScreen;