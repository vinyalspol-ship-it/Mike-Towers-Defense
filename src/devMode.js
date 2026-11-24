// Herramientas de prueba (botón DEV, +100 de oro, +2 cerebros): solo en desarrollo (npm run dev) o con ?dev en la dirección.
export const DEV_TOOLS = import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
