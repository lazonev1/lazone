import { View, Image, StyleSheet, Pressable, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';

type Props = {
  uri: string | null;
  onChange: (uri: string) => void;
};

export default function ProfileAvatar({ uri, onChange }: Props) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      onChange(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Image
        source={uri ? { uri } : require('../../assets/images/avatar-placeholder.png')}
        style={styles.image}
      />
      <Pressable onPress={pickImage}>
        <Text style={styles.changeText}>Change Photo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#444',
  },
  changeText: {
    marginTop: 8,
    color: '#FF9900',
    fontWeight: '500',
  },
});