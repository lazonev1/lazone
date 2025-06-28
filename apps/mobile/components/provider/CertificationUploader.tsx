import { View, StyleSheet, TouchableOpacity, Appearance } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from '@/components/ThemedText';
import { TextBox } from '@/components/ui/TextBox';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

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

  const addNewCertification = () => {
    const newCert = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      date: '',
    };
    onChange([...certificates, newCert]);
  };

  const pickDocument = async (id: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (result.type === 'success') {
        const updatedCerts = certificates.map(cert =>
          cert.id === id ? { ...cert, document: result.uri } : cert
        );
        onChange(updatedCerts);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  return (
    <View style={styles.container}>
      {certificates.length === 0 ? (
        <TouchableOpacity 
          style={styles.emptyState}
          onPress={addNewCertification}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={48} 
            color={theme.text} 
          />
          <ThemedText style={styles.emptyStateText}>
            Add your first certification
          </ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            Include professional certificates, awards, or recognitions
          </ThemedText>
        </TouchableOpacity>
      ) : (
        <>
          {certificates.map((cert, index) => (
            <View key={cert.id} style={styles.certCard}>
              <View style={styles.cardHeader}>
                <View style={styles.certIcon}>
                  <Ionicons 
                    name="ribbon-outline" 
                    size={24} 
                    color={theme.text} 
                  />
                </View>
                <TouchableOpacity 
                  onPress={() => onChange(certificates.filter(c => c.id !== cert.id))}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              <TextBox
                label="Certificate Name"
                value={cert.name}
                onChangeText={(text) => {
                  const updatedCerts = [...certificates];
                  updatedCerts[index] = { ...cert, name: text };
                  onChange(updatedCerts);
                }}
                placeholder="e.g., Professional Electrician Certification"
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <TextBox
                    label="Issuing Organization"
                    value={cert.issuer}
                    onChangeText={(text) => {
                      const updatedCerts = [...certificates];
                      updatedCerts[index] = { ...cert, issuer: text };
                      onChange(updatedCerts);
                    }}
                    placeholder="e.g., IEEE"
                  />
                </View>
                <View style={styles.flex1}>
                  <TextBox
                    label="Issue Date"
                    value={cert.date}
                    onChangeText={(text) => {
                      const updatedCerts = [...certificates];
                      updatedCerts[index] = { ...cert, date: text };
                      onChange(updatedCerts);
                    }}
                    placeholder="MM/YYYY"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={() => pickDocument(cert.id)}
              >
                <Ionicons 
                  name={cert.document ? "document-text" : "cloud-upload-outline"} 
                  size={24} 
                  color={theme.text}
                />
                <ThemedText style={styles.uploadText}>
                  {cert.document ? "Document Uploaded" : "Upload Certificate"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity 
            style={styles.addButton}
            onPress={addNewCertification}
          >
            <Ionicons name="add" size={20} color={theme.text} />
            <ThemedText style={styles.addButtonText}>
              Add Another Certification
            </ThemedText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 16,
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  flex1: {
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#f5f5f5',
    marginTop: 16,
  },
  uploadText: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
