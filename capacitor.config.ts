import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.starfire.ioscinny',
  appName: 'Starfire iOS',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
