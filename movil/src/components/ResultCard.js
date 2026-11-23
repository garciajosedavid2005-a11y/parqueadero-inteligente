import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import ColombianPlate from './ColombianPlate';

export default function ResultCard({ visible, result, onClose, onScanAgain, imageUri }) {
  if (!visible || !result) return null;

  const data = result.data || {};
  const estado = data.estado || result.estado || 'desconocido';
  const placa = data.placa || null;
  const confianza = typeof data.confianza === 'number' ? (data.confianza * 100).toFixed(1) : null;

  // Configuraciones visuales según estado
  let statusConfig = {
    title: 'Resultado del Procesamiento',
    badge: 'Procesado',
    color: theme.colors.primary,
    bgBadge: 'rgba(59, 130, 246, 0.15)',
    icon: 'checkmark-circle-outline',
    description: data.mensaje || 'Información procesada correctamente',
  };

  if (estado === 'entrada') {
    statusConfig = {
      title: '¡Entrada Exitosa!',
      badge: 'ENTRADA REGISTRADA',
      color: theme.colors.success,
      bgBadge: theme.colors.successBg,
      icon: 'enter-outline',
      description: data.mensaje || 'Vehículo ingresado al parqueadero.',
    };
  } else if (estado === 'salida') {
    statusConfig = {
      title: '¡Salida y Cobro!',
      badge: 'SALIDA REGISTRADA',
      color: theme.colors.info,
      bgBadge: theme.colors.infoBg,
      icon: 'exit-outline',
      description: data.mensaje || 'Vehículo ha salido del parqueadero.',
    };
  } else if (estado === 'ya_registrado') {
    statusConfig = {
      title: 'Vehículo ya registrado',
      badge: 'ANTI-REBOTE ACTIVO',
      color: theme.colors.warning,
      bgBadge: theme.colors.warningBg,
      icon: 'time-outline',
      description: data.mensaje || 'Esta placa acaba de registrar su entrada hace menos de 30 segundos.',
    };
  } else if (estado === 'sin_placa') {
    statusConfig = {
      title: 'Placa no detectada',
      badge: 'SIN PLACA',
      color: theme.colors.danger,
      bgBadge: theme.colors.dangerBg,
      icon: 'alert-circle-outline',
      description: data.mensaje || 'No se identificó ningún patrón de placa vehicular en la imagen.',
    };
  } else if (estado === 'lectura_dudosa') {
    statusConfig = {
      title: 'Lectura Insegura',
      badge: 'CONFIRMAR PLACA',
      color: theme.colors.warning,
      bgBadge: theme.colors.warningBg,
      icon: 'help-circle-outline',
      description: data.mensaje || 'El modelo leyó caracteres pero con baja certeza. Se recomienda tomar otra foto más nítida.',
    };
  } else if (estado === 'error_modelo') {
    statusConfig = {
      title: 'Error de IA / Modelo',
      badge: 'MODELO OFFLINE',
      color: theme.colors.danger,
      bgBadge: theme.colors.dangerBg,
      icon: 'hardware-chip-outline',
      description: 'El backend no pudo comunicarse con el servicio del modelo en el puerto 5001.',
    };
  } else if (result.exito === false || estado === 'error_conexion') {
    statusConfig = {
      title: 'Error de Red',
      badge: 'FALLA DE CONEXIÓN',
      color: theme.colors.danger,
      bgBadge: theme.colors.dangerBg,
      icon: 'cloud-offline-outline',
      description: result.error || 'No se pudo conectar con el servidor backend.',
    };
  }

  // Formateador de moneda colombiana COP
  const formatCOP = (val) => {
    if (val === undefined || val === null) return '$ 0';
    return `$ ${Number(val).toLocaleString('es-CO')} COP`;
  };

  // Formateador de hora legible
  const formatHora = (isoStr) => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.cardContainer}>
          {/* Barra superior con badge de estado */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: statusConfig.bgBadge, borderColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} style={{ marginRight: 6 }} />
              <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                {statusConfig.badge}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{statusConfig.title}</Text>
            <Text style={styles.description}>{statusConfig.description}</Text>

            {/* Placa vehicular */}
            {placa ? (
              <View style={styles.plateWrapper}>
                <ColombianPlate plateText={placa} size="lg" />
                {confianza && (
                  <View style={styles.confidenceBarContainer}>
                    <Text style={styles.confidenceLabel}>
                      Confianza de la IA: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{confianza}%</Text>
                    </Text>
                    <View style={styles.confidenceBarBg}>
                      <View style={[
                        styles.confidenceBarFill,
                        { width: `${Math.min(100, Math.max(10, parseFloat(confianza)))}%` },
                        parseFloat(confianza) >= 70 ? styles.confHigh : styles.confLow,
                      ]} />
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            {/* Tarjeta de Cobro destacada si es salida */}
            {estado === 'salida' && (
              <View style={styles.chargeCard}>
                <Text style={styles.chargeTitle}>TOTAL A COBRAR</Text>
                <Text style={styles.chargeAmount}>{formatCOP(data.valor_a_pagar)}</Text>
                <View style={styles.chargeDetailsRow}>
                  <View style={styles.chargeDetailItem}>
                    <Text style={styles.chargeDetailLabel}>Tiempo Estacionado</Text>
                    <Text style={styles.chargeDetailValue}>{data.minutos} min</Text>
                  </View>
                  <View style={styles.chargeDetailItem}>
                    <Text style={styles.chargeDetailLabel}>Tarifa por Minuto</Text>
                    <Text style={styles.chargeDetailValue}>$ 50 COP</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Detalles de Entrada y Salida */}
            <View style={styles.detailsGrid}>
              {data.hora_entrada && (
                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel}>Hora de Entrada</Text>
                  <Text style={styles.detailBoxValue}>{formatHora(data.hora_entrada)}</Text>
                </View>
              )}

              {data.hora_salida && (
                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel}>Hora de Salida</Text>
                  <Text style={styles.detailBoxValue}>{formatHora(data.hora_salida)}</Text>
                </View>
              )}
            </View>

            {/* Foto tomada miniatura */}
            {imageUri && (
              <View style={styles.photoContainer}>
                <Text style={styles.photoLabel}>Foto enviada al modelo:</Text>
                <Image source={{ uri: imageUri }} style={styles.photoThumbnail} resizeMode="cover" />
              </View>
            )}
          </ScrollView>

          {/* Botones de acción inferior */}
          <View style={styles.actionsFooter}>
            <TouchableOpacity style={styles.scanAgainButton} onPress={onScanAgain}>
              <Ionicons name="camera-reverse-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.scanAgainButtonText}>Escanear Otra Placa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.okButton} onPress={onClose}>
              <Text style={styles.okButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radii.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  plateWrapper: {
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 10,
  },
  confidenceBarContainer: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  confidenceBarBg: {
    width: 180,
    height: 6,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  confHigh: {
    backgroundColor: theme.colors.success,
  },
  confLow: {
    backgroundColor: theme.colors.warning,
  },
  chargeCard: {
    backgroundColor: '#0F1D38',
    borderColor: '#1E3A8A',
    borderWidth: 1.5,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginVertical: 14,
    alignItems: 'center',
  },
  chargeTitle: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  chargeAmount: {
    color: '#60A5FA',
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  chargeDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chargeDetailItem: {
    alignItems: 'center',
  },
  chargeDetailLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  chargeDetailValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  detailBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailBoxLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  detailBoxValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: 4,
  },
  photoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  photoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  scanAgainButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  okButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
});

