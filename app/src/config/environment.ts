const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:8000/api/v1';

export class InvalidAppConfigurationError extends Error {
  constructor() {
    super('La dirección configurada para el servidor no es válida.');
    this.name = 'InvalidAppConfigurationError';
  }
}

export function resolveApiBaseUrl(
  configuredUrl: string | undefined = process.env.EXPO_PUBLIC_API_URL,
): string {
  const candidate = (configuredUrl || ANDROID_EMULATOR_API_URL).replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s]+$/i.test(candidate)) {
    throw new InvalidAppConfigurationError();
  }
  return candidate;
}

export const API_BASE_URL = resolveApiBaseUrl();
