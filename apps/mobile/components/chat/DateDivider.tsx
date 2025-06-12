import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type Props = {
  date: string;
};

export default function DateDivider({ date }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.dateContainer}>
        <ThemedText style={styles.dateText}>{date}</ThemedText>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dateContainer: {
    backgroundColor: '#0078d7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 12,
  },
  dateText: {
    color: '#ffffff',
    fontSize: 14,
  },
});