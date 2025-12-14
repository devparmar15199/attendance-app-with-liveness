import React from 'react';
import { StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface AuthContainerProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ title, subtitle, children }) => {
    const { colors } = useTheme();

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.flex, { backgroundColor: colors.background }]}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <Image
                    source={require('../../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text
                    variant="headlineLarge"
                    style={[styles.title, { color: colors.primary }]}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        variant="titleMedium"
                        style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
                    >
                        {subtitle}
                    </Text>
                )}
                {children}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
    },
});

export default AuthContainer;