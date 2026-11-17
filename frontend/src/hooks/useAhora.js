import { useEffect, useState } from 'react';

// Devuelve Date.now() actualizado cada `intervalo` ms (para cronometros en vivo).
export function useAhora(intervalo = 1000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return ahora;
}
