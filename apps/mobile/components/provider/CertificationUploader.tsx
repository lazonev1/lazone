import { View, StyleSheet, TouchableOpacity, Appearance, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from '@/components/ThemedText';
import { TextBox } from '@/components/ui/TextBox';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { validateCertification } from '@/utils/validation';

type Certificate = {
  id: string;
  name: string;
  issuer: string;
  date: string;
  document?: string; // Storing the URI
  documentType?: string;
  documentName?: string;
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
    if (certificates.length > 0) {
      const lastCert = certificates[certificates.length - 1];
      const validation = validateCertification(lastCert);
      
      if (!validation.isValid) {
        Alert.alert(
          'Incomplete Certificate',
          'Please complete the current certificate information before adding a new one.'
        );
        return;
      }
    }

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
      const result = await DocumentPicker.getDocumentAsync();
      console.log('Document picked:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const document = result.assets[0];
        console.log('Selected document:', document);

        const updatedCerts = certificates.map(cert =>
          cert.id === id
            ? {
                ...cert,
                document: document.uri,
                documentType: document.mimeType,
                documentName: document.name,
              }
            : cert
        );

        console.log('Updated certificates:', updatedCerts);
        onChange(updatedCerts);
        Alert.alert('Success', `Document "${document.name}" uploaded successfully`);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Could not upload the document. Please try again.');
    }
  };

  const updateCertificate = (index: number, field: keyof Certificate, value: string) => {
    const updatedCerts = [...certificates];
    updatedCerts[index] = {
      ...updatedCerts[index],
      [field]: value
    };
    onChange(updatedCerts);
  };

  const renderDocumentStatus = (cert: Certificate) => {
    if (!cert.document) return null;

    return (
      <View style={styles.documentStatus}>
        <Ionicons name="document-text" size={20} color="#4CAF50" />
        <View style={styles.documentInfo}>
          <ThemedText style={styles.documentName}>
            Document uploaded successfully
          </ThemedText>
          {cert.documentName && (
            <ThemedText style={styles.documentSubtext}>
              {cert.documentName}
            </ThemedText>
          )}
        </View>
      </View>
    );
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
                label="Certificate Name *"
                value={cert.name}
                onChangeText={(text) => updateCertificate(index, 'name', text)}
                placeholder="e.g., Professional Electrician Certification"
                error={undefined}
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <TextBox
                    label="Issuing Organization *"
                    value={cert.issuer}
                    onChangeText={(text) => updateCertificate(index, 'issuer', text)}
                    placeholder="e.g., IEEE"
                    error={undefined}
                  />
                </View>
                <View style={styles.flex1}>
                  <TextBox
                    label="Issue Date (MM/YYYY) *"
                    value={cert.date}
                    onChangeText={(text) => updateCertificate(index, 'date', text)}
                    placeholder="MM/YYYY"
                    error={undefined}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.uploadButton,
                  cert.document ? styles.uploadButtonSuccess : null
                ]}
                onPress={() => pickDocument(cert.id)}
              >
                <Ionicons 
                  name={cert.document ? "checkmark-circle" : "cloud-upload-outline"} 
                  size={24} 
                  color={cert.document ? "#4CAF50" : theme.text}
                />
                <ThemedText style={styles.uploadText}>
                  {cert.document ? "Replace Document" : "Upload Document"}
                </ThemedText>
              </TouchableOpacity>

              {renderDocumentStatus(cert)}
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
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#eee',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  uploadButtonSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
});
