import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { parkingService } from '../services/parkingService';
import ColombianPlate from '../components/ColombianPlate';

export default function ActiveScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchActivos = useCallback(async () => {
    setError(null);
    const resp = await parkingService.getVehiculosActivos();
    if (resp.exito) {
      setVehicles(resp.data || []);
    } else {
      setError(resp.error || 'No se pudo cargar la lista de vehículos');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchActivos();
    // Auto-refresco cada 25 segundos para actualizar minutos
    const interval = setInterval(fetchActivos, 25000);
    return () => clearInterval(interval);
  }, [fetchActivos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivos();
  };

  const filtered = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    return (v.placa || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const formatHora = (isoStr) => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const renderItem = ({ item }) => {
    const mins = item.minutos_transcurridos || 0;
    const estimado = mins * 50; // $50 por minuto

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ColombianPlate plateText={item.placa} size="md" />

          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeText}>${estimado.toLocaleString('es-CO')}</Text>
            <Text style={styles.rateBadgeSub}>estimado</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statItem}>
            <Ionicons name="log-in-outline" size={15} color={theme.colors.success} style={{ marginRight: 4 }} />
            <Text style={styles.statLabel}>Entrada:</Text>
            <Text style={styles.statValue}>{formatHora(item.hora_entrada)}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={15} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.statLabel}>Tiempo:</Text>
            <Text style={styles.statValue}>{mins} min</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda y contador */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por placa..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.counterBadge}>
          <Text style={styles.counterNumber}>{filtered.length}</Text>
          <Text style={styles.counterLabel}>Dentro</Text>
        </View>
      </View>

      {/* Estado de carga inicial */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando vehículos estacionados...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.danger} />
          <Text style={styles.errorTitle}>Error de conexión</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchActivos}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="car-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No se encontraron resultados' : 'El parqueadero está vacío'}
          </Text>
          <Text style={styles.emptyDesc}>
            {searchQuery
              ? `No hay vehículos activos con la placa "${searchQuery}"`
              : 'Escanea o sube la foto de un vehículo para registrar su entrada.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item.placa}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  counterBadge: {
    backgroundColor: '#1E3A8A',
    borderRadius: theme.radii.md,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  counterNumber: {
    color: '#93C5FD',
    fontSize: 16,
    fontWeight: '800',
  },
  counterLabel: {
    color: '#BFDBFE',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  rateBadge: {
    alignItems: 'flex-end',
  },
  rateBadgeText: {
    color: theme.colors.success,
    fontSize: 18,
    fontWeight: '800',
  },
  rateBadgeSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginRight: 4,
  },
  statValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  errorTitle: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  errorDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  retryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});

