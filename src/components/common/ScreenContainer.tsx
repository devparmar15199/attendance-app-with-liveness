import React from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    children: React.ReactNode;
    refreshing?: boolean;
    onRefresh?: () => void;
}

const ScreenContainer = ({ children, refreshing, onRefresh }: Props) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={[
                styles.contentContainer,
                {
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 40,
                    paddingHorizontal: 24,
                },
            ]}
            refreshControl={
                onRefresh ? (
                    <RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} />
                ) : undefined
            }
            keyboardShouldPersistTaps="handled"
        >
            {children}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {},
});

export default ScreenContainer;