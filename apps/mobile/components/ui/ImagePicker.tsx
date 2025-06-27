import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import * as ExpoImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { PortfolioItem } from '@/types/provider';

type Props = {
  images: PortfolioItem[];
  onChange: (images: PortfolioItem[]) => void;
  maxImages?: number;
};

export function ImagePicker({ images, onChange, maxImages = 3 }: Props) {
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    if (images.length >= maxImages) {
      return;
    }

    setLoading(true);
    try {
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImage: PortfolioItem = {
          id: Date.now().toString(),
          image: result.assets[0].uri,
        };
        onChange([...images, newImage]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageGrid}>
        {images.map((img) => (
          <View key={img.id} style={styles.imageContainer}>
            <Image source={{ uri: img.image }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(img.id)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
        
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={pickImage}
            disabled={loading}
          >
            <Ionicons name="add" size={32} color="#666" />
            <ThemedText style={styles.addText}>
              Add Photo
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ThemedText style={styles.helperText}>
        Add up to {maxImages} portfolio images
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
});
