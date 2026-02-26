import React, { useEffect, useRef } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';

type Props = {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

export function BottomPopup({ visible, onClose, title, children }: Props) {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const { height } = Dimensions.get('window');
    const colorScheme = Appearance.getColorScheme()
    const theme = colorScheme === 'dark' ? Colors.dark : Colors.light
    const styles = createStyles(theme, colorScheme)

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 1,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [height, 0],
    });

    return (
        <Modal
            transparent
            visible={visible}
            animationType='slide'
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.popup,
                        { transform: [{ translateY }] }
                    ]}
                >
                    <View style={styles.header}>
                        <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
                        <TouchableWithoutFeedback onPress={onClose}>
                            <Ionicons name='arrow-down' size={24} color="#999" />
                        </TouchableWithoutFeedback>
                    </View>

                    <View style={styles.content}>
                        {children}
                    </View>
                </Animated.View>
            </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = (theme: any, colorScheme: 'dark' | 'light' | null | undefined) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    popup: {
        backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        // For iOS shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        // For Android shadow
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    title: {
        fontSize: 18,
    },
    content: {
        paddingBottom: 20,
    },
});