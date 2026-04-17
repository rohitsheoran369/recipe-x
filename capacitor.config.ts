import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recipex.app',
  appName: 'Recipe X',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
