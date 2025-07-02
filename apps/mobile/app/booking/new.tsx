import { StyleSheet, Appearance, ScrollView } from "react-native";
import {Colors} from "@/constants/Colors";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from "react";


export default function NewBookingScreen() {
    // This screen will handle the booking creation process
    // It will include steps for selecting services, choosing a date/time, and confirming the booking
    const colorScheme = Appearance.getColorScheme();
    const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = createStyles(theme, colorScheme);

    const [date, setDate] = useState(new Date());
    const [show, setShow] = useState(false);

    const onChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShow(false);
        setDate(currentDate);
    };
    
    return (
        <>
        <Stack.Screen 
            options={{
                title: 'New Booking',
                headerBackTitle: 'Portfolio',
            }}
        />
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style = {styles.scrollContent}>
                <ThemedText type="subtitle">Choose a date and time for your booking</ThemedText>
                {/* Add components for selecting services, date/time, etc. */}

                <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="datetime"
                    display="default"
                    onChange={onChange}
                />
                <ThemedText type = "subtitle"> Propose budget and service details</ThemedText>
                {/* This will be a multi-step form similar to the provider registration */}

            </ScrollView>
        </SafeAreaView>
        </>

    );
}

function createStyles(theme, colorScheme){
    return StyleSheet.create({
        safeArea: {
            flex: 1,
        },
        scrollContent: {
            flex: 1,
            padding: 16,
        },
        sectionTitle: {
            marginVertical: 8,
        },
        exploreTitle: {
            marginTop: 24,
            marginBottom: 12,
        },
        categories: {
            paddingLeft: 16,
        },
    })
}