import { View, StyleSheet, TouchableOpacity, Image, Appearance } from 'react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from '@/components/ThemedText';
import { TextBox } from '@/components/ui/TextBox';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@lazone/ui';

type Certificate = {
  id: string;
  name: string;
  issuer: string;
  date: string;
  document?: string;
};

type Props = {
  certificates: Certificate[];
  onChange: (certs: Certificate[]) => void;
};

export function CertificationUploader({ certificates, onChange }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const addCertificate = async () => {
    const newCert: Certificate = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      date: '',
    };
    onChange([...certificates, newCert]);
  };

  const updateCertificate = (id: string, field: keyof Certificate, value: string) => {
    onChange(
      certificates.map(cert => 
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    );
  };

  const removeCertificate = (id: string) => {
    onChange(certificates.filter(cert => cert.id !== id));
  };

  const pickDocument = async (id: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (result.type === 'success') {
        updateCertificate(id, 'document', result.uri);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  return (
    <View style={styles.container}>
      {certificates.map((cert) => (
        <View key={cert.id} style={styles.certCard}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.certTitle}>Certification</ThemedText>
            <TouchableOpacity onPress={() => removeCertificate(cert.id)}>
              <Ionicons name="close-circle" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TextBox
            label="Certificate Name"
            value={cert.name}
            onChangeText={(text) => updateCertificate(cert.id, 'name', text)}
            placeholder="e.g., Advanced Electrical Engineering"
          />

          <TextBox
            label="Issuing Organization"
            value={cert.issuer}
            onChangeText={(text) => updateCertificate(cert.id, 'issuer', text)}
            placeholder="e.g., IEEE"
          />

          <TextBox
            label="Date Received"
            value={cert.date}
            onChangeText={(text) => updateCertificate(cert.id, 'date', text)}
            placeholder="MM/YYYY"
          />

          <Button
            label={cert.document ? "Change Document" : "Upload Document"}
            onPress={() => pickDocument(cert.id)}
            variant="secondary"
            icon="document-outline"
            style={styles.uploadButton}
          />

          {cert.document && (
            <ThemedText style={styles.documentName}>
              Document uploaded ✓
            </ThemedText>
          )}
        </View>
      ))}

      <Button
        label="Add Certification"
        onPress={addCertificate}
        variant="secondary"
        icon="add-circle-outline"
        style={styles.addButton}
      />
    </View>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    gap: 16,
  },
  certCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#eee',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    marginTop: 12,
  },
  documentName: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  addButton: {
    marginTop: 8,
  },
});
