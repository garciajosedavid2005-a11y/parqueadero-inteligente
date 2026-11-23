import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

/**
 * Componente visual que reproduce el diseño de una placa vehicular colombiana
 * (Amarilla con borde y letras negras, formato ABC 123 o ABC 12D)
 */
export default function ColombianPlate({ plateText = 'ABC123', size = 'md' }) {
  // Limpiar y dar formato legible (ej: ABC · 123)
  const clean = (plateText || '').toUpperCase().trim();
  let formatted = clean;
  if (clean.length === 6) {
    formatted = `${clean.slice(0, 3)} · ${clean.slice(3)}`;
  }

  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[
      styles.plateContainer,
      isLg && styles.plateContainerLg,
      isSm && styles.plateContainerSm,
    ]}>
      {/* Tornillos simulados en las esquinas */}
      <View style={[styles.bolt, styles.boltTopLeft, isSm && styles.boltSm]} />
      <View style={[styles.bolt, styles.boltTopRight, isSm && styles.boltSm]} />
      <View style={[styles.bolt, styles.boltBottomLeft, isSm && styles.boltSm]} />
      <View style={[styles.bolt, styles.boltBottomRight, isSm && styles.boltSm]} />

      {/* Texto de la placa */}
      <Text
        style={[
          styles.plateText,
          isLg && styles.plateTextLg,
          isSm && styles.plateTextSm,
        ]}
        numberOfLines={1}
      >
        {formatted || '--- ---'}
      </Text>

      {/* Subtítulo COLOMBIA */}
      {!isSm && (
        <Text style={[styles.subText, isLg && styles.subTextLg]}>
          COLOMBIA
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plateContainer: {
    backgroundColor: theme.colors.plate.yellow,
    borderColor: theme.colors.plate.border,
    borderWidth: 3,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  plateContainerLg: {
    borderWidth: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 230,
  },
  plateContainerSm: {
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    minWidth: 100,
  },
  plateText: {
    color: theme.colors.plate.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  plateTextLg: {
    fontSize: 34,
    letterSpacing: 4,
  },
  plateTextSm: {
    fontSize: 14,
    letterSpacing: 1,
  },
  subText: {
    color: '#333333',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginTop: 2,
  },
  subTextLg: {
    fontSize: 10,
    marginTop: 4,
  },
  bolt: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.plate.bolt,
    borderColor: '#333',
    borderWidth: 0.8,
  },
  boltSm: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  boltTopLeft: {
    top: 5,
    left: 6,
  },
  boltTopRight: {
    top: 5,
    right: 6,
  },
  boltBottomLeft: {
    bottom: 5,
    left: 6,
  },
  boltBottomRight: {
    bottom: 5,
    right: 6,
  },
});

