import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.starfire.ioscinny',
  appName: 'Starfire iOS',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
