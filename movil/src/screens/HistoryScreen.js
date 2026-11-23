import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { parkingService } from '../services/parkingService';
import ColombianPlate from '../components/ColombianPlate';

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const fetchHistorial = useCallback(async () => {
    setError(null);
    const resp = await parkingService.getHistorial(50);
    if (resp.exito) {
      setHistory(resp.data || []);
    } else {
      setError(resp.error || 'No se pudo cargar el historial');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistorial();
  };

  const totalRecaudado = history.reduce((sum, item) => sum + (item.valor_a_pagar || 0), 0);

  const formatHora = (isoStr) => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' +
        d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ColombianPlate plateText={item.placa} size="sm" />
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>
            ${(item.valor_a_pagar || 0).toLocaleString('es-CO')} COP
          </Text>
          <Text style={styles.durationText}>{item.minutos || 0} min</Text>
        </View>
      </View>

      <View style={styles.cardTimestamps}>
        <View style={styles.timestampItem}>
          <Text style={styles.timestampLabel}>Entrada</Text>
          <Text style={styles.timestampValue}>{formatHora(item.hora_entrada)}</Text>
        </View>

        <Ionicons name="arrow-forward" size={14} color={theme.colors.textMuted} />

        <View style={styles.timestampItem}>
          <Text style={styles.timestampLabel}>Salida</Text>
          <Text style={styles.timestampValue}>{formatHora(item.hora_salida)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Resumen Superior */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL RECAUDADO</Text>
          <Text style={styles.summaryValue}>${totalRecaudado.toLocaleString('es-CO')} COP</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardSecondary]}>
          <Text style={styles.summaryLabel}>VEHÍCULOS ATENDIDOS</Text>
          <Text style={styles.summaryValue}>{history.length}</Text>
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.danger} />
          <Text style={styles.errorTitle}>Error al obtener historial</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistorial}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Sin historial todavía</Text>
          <Text style={styles.emptyDesc}>
            Cuando los vehículos registren su salida, los cobros aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id || Math.random().toString()}
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
  summaryBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0F1D38',
    borderColor: '#1E3A8A',
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: 12,
  },
  summaryCardSecondary: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
  },
  summaryLabel: {
    color: '#93C5FD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: theme.colors.primaryLight,
    fontSize: 15,
    fontWeight: '800',
  },
  durationText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  cardTimestamps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingTop: 8,
  },
  timestampItem: {
    alignItems: 'flex-start',
  },
  timestampLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  timestampValue: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
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

