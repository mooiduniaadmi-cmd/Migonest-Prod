import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.migonest.app',
  appName: 'Migonest',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  backgroundColor: '#0f172a',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark
    }
  }
};

export default config;
