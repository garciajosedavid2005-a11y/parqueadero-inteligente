import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './src/styles/theme';
import ScanScreen from './src/screens/ScanScreen';
import ActiveScreen from './src/screens/ActiveScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ServerConfigModal from './src/components/ServerConfigModal';
import { getBackendUrl, testConnection } from './src/config/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'active' | 'history'
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [currentBackendUrl, setCurrentBackendUrl] = useState('');

  // Comprobar estado del servidor periódicamente
  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const checkServerHealth = async () => {
    const url = await getBackendUrl();
    setCurrentBackendUrl(url);
    const res = await testConnection(url);
    setServerStatus(res.ok ? 'online' : 'offline');
  };

  const handleUrlChanged = (newUrl) => {
    setCurrentBackendUrl(newUrl);
    checkServerHealth();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />

      {/* Header Superior */}
      <View style={styles.header}>
        <View style={styles.brandingRow}>
          <View style={styles.logoIconContainer}>
            <Ionicons name="car-sport" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.appTitle}>Parqueadero Inteligente</Text>
            <Text style={styles.appSubtitle}>Reconocimiento de Placas CNN</Text>
          </View>
        </View>

        {/* Botón de Estado del Servidor / Ajustes de IP */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setConfigModalVisible(true)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.statusDot,
              serverStatus === 'online' && styles.dotOnline,
              serverStatus === 'offline' && styles.dotOffline,
              serverStatus === 'checking' && styles.dotChecking,
            ]}
          />
          <Text style={styles.serverPillText}>
            {serverStatus === 'online' ? 'Servidor OK' : serverStatus === 'offline' ? 'Desconectado' : 'Conectando'}
          </Text>
          <Ionicons name="settings-sharp" size={13} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Contenido de la Pantalla Activa */}
      <View style={styles.screenContainer}>
        {activeTab === 'scan' && (
          <ScanScreen onNavigateToActive={() => setActiveTab('active')} />
        )}
        {activeTab === 'active' && <ActiveScreen />}
        {activeTab === 'history' && <HistoryScreen />}
      </View>

      {/* Barra de Navegación Inferior (Tabs) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'scan' && styles.navTabActive]}
          onPress={() => setActiveTab('scan')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'scan' ? 'camera' : 'camera-outline'}
            size={22}
            color={activeTab === 'scan' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navLabel, activeTab === 'scan' && styles.navLabelActive]}>
            Escanear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'active' && styles.navTabActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'active' ? 'car' : 'car-outline'}
            size={22}
            color={activeTab === 'active' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navLabel, activeTab === 'active' && styles.navLabelActive]}>
            Activos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'history' && styles.navTabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'history' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'history' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navLabel, activeTab === 'history' && styles.navLabelActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Configuración de Servidor */}
      <ServerConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
        onUrlChanged={handleUrlChanged}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  appSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: theme.colors.success,
  },
  dotOffline: {
    backgroundColor: theme.colors.danger,
  },
  dotChecking: {
    backgroundColor: theme.colors.warning,
  },
  serverPillText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navTabActive: {
    // efecto activo
  },
  navLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  navLabelActive: {
    color: theme.colors.primaryLight,
    fontWeight: '800',
  },
});
