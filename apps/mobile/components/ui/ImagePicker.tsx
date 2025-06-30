import { View, StyleSheet, TouchableOpacity, Image, Appearance } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { TextBox } from './TextBox';

type ImageItem = {
  id: string;
  uri: string;
  caption?: string;
};

type Props = {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  allowCaptions?: boolean;
  captionPlaceholder?: string;
};

export function PortfolioImagePicker({  
  images,
  onChange,
  maxImages = 6,
  allowCaptions = false,
  captionPlaceholder = "Add a caption..."
}: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert('Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Fixed: use MediaTypeOptions instead of MediaType
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage: ImageItem = {
          id: Date.now().toString(),
          uri: result.assets[0].uri
        };
        onChange([...images, newImage]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const removeImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    onChange(
      images.map(img => 
        img.id === id ? { ...img, caption } : img
      )
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageGrid}>
        {images.map((img) => (
          <View key={img.id} style={styles.imageContainer}>
            <Image source={{ uri: img.uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(img.id)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
            {allowCaptions && (
              <TextBox
                value={img.caption}
                onChangeText={(text) => updateCaption(img.id, text)}
                placeholder={captionPlaceholder}
                style={styles.caption}
                multiline
              />
            )}
          </View>
        ))}
        
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={pickImage}
          >
            <Ionicons name="add" size={32} color={theme.text} />
            <ThemedText style={styles.addText}>Add Photo</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: '48%',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  caption: {
    marginTop: 4,
  },
  addButton: {
    width: '48%',
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
  },
  addText: {
    fontSize: 14,
    marginTop: 4,
  },
});
