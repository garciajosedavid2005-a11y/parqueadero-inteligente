import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { parkingService } from '../services/parkingService';
import ResultCard from '../components/ResultCard';
import ColombianPlate from '../components/ColombianPlate';

export default function ScanScreen({ onNavigateToActive }) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [lastPhoto, setLastPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Pedir permisos de cámara
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso de Cámara Requerido',
        'Necesitamos acceso a la cámara para fotografiar la placa del vehículo.'
      );
      return false;
    }
    return true;
  };

  // Pedir permisos de galería
  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso de Galería Requerido',
        'Necesitamos acceso a la galería para seleccionar fotos de vehículos ya tomadas.'
      );
      return false;
    }
    return true;
  };

  // 1. TOMAR FOTO CON LA CÁMARA
  const handleTakePhoto = async () => {
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) return;

    try {
      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true, // Permite encuadrar y recortar la placa antes de enviar
        aspect: [16, 9],
        quality: 0.85,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        setLastPhoto(asset.uri);
        enviarAlBackend(asset.base64, asset.uri, 'camara_movil');
      }
    } catch (err) {
      console.error('Error al abrir la cámara:', err);
      Alert.alert('Error', 'No se pudo abrir la cámara: ' + err.message);
    }
  };

  // 2. SUBIR IMAGEN DESDE LA GALERÍA
  const handlePickFromGallery = async () => {
    const hasPerm = await requestGalleryPermission();
    if (!hasPerm) return;

    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        setLastPhoto(asset.uri);
        enviarAlBackend(asset.base64, asset.uri, 'galeria_movil');
      }
    } catch (err) {
      console.error('Error al seleccionar imagen:', err);
      Alert.alert('Error', 'No se pudo acceder a la galería: ' + err.message);
    }
  };

  // 3. ENVIAR AL BACKEND Y CORRER MODELO CNN
  const enviarAlBackend = async (base64Data, uri, origen) => {
    setLoading(true);
    setLoadingStep('Enviando imagen al backend Flask...');

    try {
      // Simular progreso para dar feedback visual fluido
      const stepTimer = setTimeout(() => {
        setLoadingStep('Modelo CNN analizando y segmentando placa...');
      }, 1000);

      const resp = await parkingService.procesarImagen(base64Data, { origen });
      clearTimeout(stepTimer);

      setLoading(false);
      setLoadingStep('');
      setResult(resp);
      setShowResult(true);
    } catch (err) {
      setLoading(false);
      setLoadingStep('');
      setResult({
        exito: false,
        estado: 'error_conexion',
        error: err.message || 'Error desconocido al enviar imagen',
      });
      setShowResult(true);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tarjeta de guía / visor para la placa */}
      <View style={styles.viewfinderCard}>
        <View style={styles.viewfinderGuide}>
          {/* Esquinas de enfoque estilo escáner */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {lastPhoto ? (
            <Image source={{ uri: lastPhoto }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="scan-outline" size={60} color={theme.colors.primary} />
              <Text style={styles.placeholderTitle}>Enfoca la placa del vehículo</Text>
              <Text style={styles.placeholderSubtitle}>
                Captura la placa centrada, limpia y con buena luz para máxima precisión del modelo
              </Text>
            </View>
          )}

          {/* Overlay de carga */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingTitle}>Procesando con IA</Text>
              <Text style={styles.loadingStep}>{loadingStep}</Text>
            </View>
          )}
        </View>

        {/* Muestra rápida de placa de ejemplo o última detectada */}
        <View style={styles.samplePlateRow}>
          <Text style={styles.samplePlateLabel}>Formato Colombiano compatible:</Text>
          <ColombianPlate plateText="ABC123" size="sm" />
        </View>
      </View>

      {/* BOTONES PRINCIPALES: TOMAR FOTO Y SUBIR DE GALERÍA */}
      <View style={styles.actionButtonsContainer}>
        {/* Botón 1: Tomar Foto con Cámara */}
        <TouchableOpacity
          style={[styles.mainButton, styles.cameraButton]}
          onPress={handleTakePhoto}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="camera" size={26} color="#fff" />
          </View>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.mainButtonTitle}>Tomar Foto con Cámara</Text>
            <Text style={styles.mainButtonSubtitle}>Abre la cámara para escanear en vivo</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Botón 2: Subir Foto de la Galería */}
        <TouchableOpacity
          style={[styles.mainButton, styles.galleryButton]}
          onPress={handlePickFromGallery}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, styles.galleryIconCircle]}>
            <Ionicons name="images" size={24} color="#fff" />
          </View>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.mainButtonTitle}>Subir desde Galería</Text>
            <Text style={styles.mainButtonSubtitle}>Selecciona una imagen ya tomada</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Tarjeta Informativa / Consejos de Uso */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb-outline" size={18} color={theme.colors.warning} style={{ marginRight: 6 }} />
          <Text style={styles.tipsTitle}>CONSEJOS DE CAPTURA</Text>
        </View>

        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={styles.tipText}>
            Encuadra la placa de frente, a no más de 2 metros de distancia del auto.
          </Text>
        </View>

        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={styles.tipText}>
            Si es la primera vez que entra, se registrará la <Text style={{ color: theme.colors.success, fontWeight: '700' }}>ENTRADA</Text>.
          </Text>
        </View>

        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={styles.tipText}>
            Si el vehículo ya está dentro, se calculará el tiempo y el cobro de la <Text style={{ color: theme.colors.info, fontWeight: '700' }}>SALIDA</Text>.
          </Text>
        </View>
      </View>

      {/* Modal con los resultados detallados */}
      <ResultCard
        visible={showResult}
        result={result}
        imageUri={lastPhoto}
        onClose={() => setShowResult(false)}
        onScanAgain={() => {
          setShowResult(false);
          handleTakePhoto();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  viewfinderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  viewfinderGuide: {
    height: 220,
    backgroundColor: '#0F1524',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  placeholderSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: theme.colors.primary,
    borderWidth: 3,
    zIndex: 2,
  },
  cornerTL: {
    top: 16,
    left: 16,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  loadingTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  loadingStep: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  samplePlateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.surface,
  },
  samplePlateLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
  },
  cameraButton: {
    backgroundColor: '#1E3A8A',
    borderColor: '#2563EB',
  },
  galleryButton: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  galleryIconCircle: {
    backgroundColor: '#475569',
  },
  buttonTextContainer: {
    flex: 1,
  },
  mainButtonTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  mainButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.warning,
    letterSpacing: 1,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

