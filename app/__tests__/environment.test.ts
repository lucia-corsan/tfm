import {
  InvalidAppConfigurationError,
  resolveApiBaseUrl,
} from '@/config/environment';

describe('mobile API configuration', () => {
  test('uses the Android Emulator host address by default', () => {
    expect(resolveApiBaseUrl('')).toBe('http://10.0.2.2:8000/api/v1');
  });

  test('removes trailing slashes from a configured address', () => {
    expect(resolveApiBaseUrl('https://api.example.test/v1///')).toBe(
      'https://api.example.test/v1',
    );
  });

  test('rejects a non-HTTP address', () => {
    expect(() => resolveApiBaseUrl('file:///tmp/routes.json')).toThrow(
      InvalidAppConfigurationError,
    );
  });
});
