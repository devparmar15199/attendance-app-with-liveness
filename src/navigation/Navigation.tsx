import React, { useEffect } from "react";
import Ionicons from '@expo/vector-icons/Ionicons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from "react-native-paper";

import { useAuthStore } from "../store/useAuthStore";
import { useClassStore } from "../store/useClassStore";
import { RootStackParamList, TabParamList } from "../types";

// Import all screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import ScanScreen from "../screens/ScanScreen";
import ClassesScreen from "../screens/ClassesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import ClassDetailsScreen from "../screens/ClassDetailsScreen";
import FaceLivenessScreen from "../screens/FaceLivenessScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import UpdateFaceScreen from '../screens/UpdateFaceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const tabIconMap: Record<
    keyof TabParamList,
    { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }
> = {
    Home: { focused: 'home', unfocused: 'home-outline' },
    Scan: { focused: 'qr-code', unfocused: 'qr-code-outline' },
    Classes: { focused: 'school', unfocused: 'school-outline' },
    Profile: { focused: 'person-circle', unfocused: 'person-circle-outline' },
};

// --- Bottom Tab Navigator (Internal to the Main Stack) ---
const TabNavigator = () => {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    const iconName = focused
                        ? tabIconMap[route.name].focused
                        : tabIconMap[route.name].unfocused;
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.onSurfaceVariant,
                tabBarStyle: {
                    backgroundColor: colors.elevation.level2,
                    borderTopWidth: 1,
                    borderTopColor: colors.outlineVariant,
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Scan" component={ScanScreen} />
            <Tab.Screen name="Classes" component={ClassesScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

// --- Main Stack Navigator (Root) ---
export const Navigation = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { colors } = useTheme();

    useEffect(() => {
        if (!isAuthenticated) {
            useClassStore.getState().clearData();
        }
    }, [isAuthenticated]);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
                // --- Authenticated Stack Group ---
                <Stack.Group
                    screenOptions={{
                        headerShown: true,
                        headerStyle: {
                            backgroundColor: colors.surface,
                        },
                        headerTintColor: colors.onSurface,
                        headerTitleStyle: {
                            color: colors.onSurface,
                        },
                    }}
                >
                    <Stack.Screen
                        name="MainTabs"
                        component={TabNavigator}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ChangePassword"
                        component={ChangePasswordScreen}
                        options={{ title: 'Change Password' }}
                    />
                    <Stack.Screen
                        name="ClassDetails"
                        component={ClassDetailsScreen}
                        options={{ title: 'Class Details' }}
                    />
                    <Stack.Screen
                        name="FaceLiveness"
                        component={FaceLivenessScreen}
                        options={{ title: 'Face Verification' }}
                    />
                    <Stack.Screen
                        name="EditProfile"
                        component={EditProfileScreen}
                        options={{ title: 'Edit Profile' }}
                    />
                    <Stack.Screen
                        name="UpdateFace"
                        component={UpdateFaceScreen}
                        options={{ title: 'Update Face' }}
                    />
                </Stack.Group>
            ) : (
                // --- Auth Stack Group ---
                <Stack.Group screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
};