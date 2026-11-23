import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { getBackendUrl, setBackendUrl, testConnection, PRESETS } from '../config/api';

export default function ServerConfigModal({ visible, onClose, onUrlChanged }) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (visible) {
      loadUrl();
    }
  }, [visible]);

  const loadUrl = async () => {
    const u = await getBackendUrl();
    setCurrentUrl(u);
    setTestResult(null);
  };

  const handleTest = async (urlToTest) => {
    const target = urlToTest || currentUrl;
    setTesting(true);
    setTestResult(null);
    const res = await testConnection(target);
    setTesting(false);
    setTestResult(res);
  };

  const handleSave = async () => {
    if (!currentUrl.trim()) return;
    const clean = await setBackendUrl(currentUrl);
    if (onUrlChanged) onUrlChanged(clean);
    onClose();
  };

  const selectPreset = (url) => {
    setCurrentUrl(url);
    handleTest(url);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="server-outline" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Configurar Backend</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            Ingresa la URL del backend Flask (puerto 5000). Para probar desde tu celular físico, usa la IP de tu PC en la red Wi-Fi:
          </Text>

          {/* Campo de texto de URL */}
          <View style={styles.inputContainer}>
            <Ionicons name="globe-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              value={currentUrl}
              onChangeText={(t) => {
                setCurrentUrl(t);
                setTestResult(null);
              }}
              placeholder="http://192.168.1.X:5000"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Botón de probar conexión */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => handleTest()}
            disabled={testing || !currentUrl.trim()}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flash-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.testBtnText}>Probar Conexión (/health)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Resultado de la prueba */}
          {testResult && (
            <View style={[
              styles.testResultBox,
              testResult.ok ? styles.testSuccess : styles.testError,
            ]}>
              <Ionicons
                name={testResult.ok ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={testResult.ok ? theme.colors.success : theme.colors.danger}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.testResultTitle, { color: testResult.ok ? theme.colors.success : theme.colors.danger }]}>
                  {testResult.ok ? `¡Conexión Exitosa! (${testResult.latency} ms)` : 'Fallo de Conexión'}
                </Text>
                <Text style={styles.testResultDesc}>
                  {testResult.ok
                    ? `Servicio: ${testResult.data?.servicio || 'backend activo'}`
                    : testResult.error}
                </Text>
              </View>
            </View>
          )}

          {/* Presets rápidos */}
          <Text style={styles.presetsTitle}>ACCESOS RÁPIDOS SUGERIDOS:</Text>
          <View style={styles.presetsList}>
            {PRESETS.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  currentUrl === p.url && styles.presetChipActive,
                ]}
                onPress={() => selectPreset(p.url)}
              >
                <Text style={[
                  styles.presetText,
                  currentUrl === p.url && styles.presetTextActive,
                ]}>
                  {p.label}
                </Text>
                <Text style={styles.presetUrlText}>{p.url}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Botones de acción */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Guardar URL</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  helpText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
  },
  testBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  testBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.radii.md,
    marginBottom: 12,
    borderWidth: 1,
  },
  testSuccess: {
    backgroundColor: theme.colors.successBg,
    borderColor: theme.colors.successBorder,
  },
  testError: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
  },
  testResultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  testResultDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  presetsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  presetsList: {
    gap: 6,
    marginBottom: 18,
  },
  presetChip: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  presetChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  presetTextActive: {
    color: theme.colors.primaryLight,
  },
  presetUrlText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

