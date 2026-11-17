export const TARIFA_MINUTO = Number(import.meta.env.VITE_TARIFA_MINUTO) || 50;

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const hora = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const fecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
});

// El backend envia fechas ISO sin zona horaria (hora local del servidor).
export function parseFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatMoneda(valor) {
  if (valor == null) return '--';
  return moneda.format(valor);
}

export function formatHora(iso) {
  const d = parseFecha(iso);
  return d ? hora.format(d) : '--';
}

export function formatFecha(iso) {
  const d = parseFecha(iso);
  return d ? fecha.format(d).replace('.', '') : '--';
}

export function esHoy(iso) {
  const d = parseFecha(iso);
  if (!d) return false;
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString();
}

export function formatDuracion(minutos) {
  if (minutos == null) return '--';
  const m = Math.max(0, Math.floor(minutos));
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (h === 0) return `${resto} min`;
  return `${h} h ${String(resto).padStart(2, '0')} min`;
}

export function formatCronometro(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return [h, m, r].map((n) => String(n).padStart(2, '0')).join(':');
}

// Misma regla del backend: minimo 1 minuto, se cobra cada minuto iniciado.
export function estimarCobro(isoEntrada, ahora = Date.now()) {
  const d = parseFecha(isoEntrada);
  if (!d) return { segundos: 0, minutos: 0, valor: 0 };
  const segundos = Math.max(0, (ahora - d.getTime()) / 1000);
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  return { segundos, minutos, valor: minutos * TARIFA_MINUTO };
}

export function formatConfianza(c) {
  if (c == null) return '--';
  return `${(c * 100).toFixed(1)}%`;
}

// "ABC123" -> "ABC 123"
export function formatPlaca(placa) {
  if (!placa) return '';
  const p = String(placa).toUpperCase();
  return p.length === 6 ? `${p.slice(0, 3)} ${p.slice(3)}` : p;
}
