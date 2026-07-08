import { config } from '../config';

export const buildAllowedOrigins = (): string[] => {
  const origins = [
    config.frontendUrl,
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'https://empsystem-tcs.netlify.app',
  ];
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').forEach((o) => origins.push(o.trim()));
  }
  return origins;
};

export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Mobile apps / curl / server-to-server — no origin = allow
  if (origin === 'null') return true; // Capacitor / Cordova send literal "null"
  if (origin.startsWith('file://')) return true; // Electron / desktop webview
  if (origin.startsWith('capacitor://')) return true; // Capacitor iOS/Android
  if (origin.startsWith('ionic://')) return true; // Ionic
  return buildAllowedOrigins().includes(origin);
};
