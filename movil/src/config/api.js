import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = '@parqueadero_backend_url';

// IP detectada de la máquina host en la red local
const DETECTED_WIFI_IP = '172.16.90.66';

export const PRESETS = [
  {
    label: 'Red Wi-Fi Host (Recomendado para celular físico)',
    url: `http://${DETECTED_WIFI_IP}:5000`,
  },
  {
    label: 'Localhost (Web / iOS Simulator)',
    url: 'http://localhost:5000',
  },
  {
    label: 'Emulador Android (10.0.2.2)',
    url: 'http://10.0.2.2:5000',
  },
];

// Fallback por defecto según plataforma
export const getDefaultUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  return `http://${DETECTED_WIFI_IP}:5000`;
};

let cachedUrl = null;

export const getBackendUrl = async () => {
  if (cachedUrl) return cachedUrl;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      cachedUrl = saved.trim().replace(/\/+$/, '');
      return cachedUrl;
    }
  } catch (e) {
    console.warn('Error leyendo URL guardada de AsyncStorage:', e);
  }
  cachedUrl = getDefaultUrl();
  return cachedUrl;
};

export const setBackendUrl = async (url) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  cachedUrl = cleanUrl;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, cleanUrl);
  } catch (e) {
    console.warn('Error guardando URL en AsyncStorage:', e);
  }
  return cleanUrl;
};

export const testConnection = async (urlToTest) => {
  const target = (urlToTest || await getBackendUrl()).replace(/\/+$/, '');
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${target}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    if (response.ok) {
      const data = await response.json();
      return { ok: true, latency, data, error: null };
    }
    return { ok: false, latency, data: null, error: `HTTP ${response.status}` };
  } catch (err) {
    const latency = Date.now() - startTime;
    return {
      ok: false,
      latency,
      data: null,
      error: err.name === 'AbortError' ? 'Tiempo de espera agotado (Timeout 4s)' : (err.message || 'Sin conexión'),
    };
  }
};

