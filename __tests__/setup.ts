/**
 * Jest 测试环境配置
 * 模拟 React Native / Expo 环境中不可用的原生模块
 */
import 'react-native';

// ── 模拟 expo-crypto ──
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 9),
}));

// ── 模拟 expo-sqlite ──
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      getAllAsync: jest.fn(() => Promise.resolve([])),
      closeAsync: jest.fn(),
    })
  ),
}));

// ── 模拟 expo-file-system/legacy ──
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

// ── 模拟 expo-document-picker ──
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

// ── 模拟 expo-image-picker ──
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

// ── 模拟 expo-image-manipulator ──
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'file:///test/image.jpg' })),
  SaveFormat: { JPEG: 'jpeg' },
}));

// ── 模拟 expo-media-library ──
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

// ── 模拟 expo-sharing ──
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// ── 模拟 expo-clipboard ──
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

// ── 模拟 expo-haptics ──
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// ── 模拟 expo-av ──
jest.mock('expo-av', () => ({
  Audio: {
    Recording: {
      createAsync: jest.fn(() =>
        Promise.resolve({ recording: { stopAndUnloadAsync: jest.fn(), getURI: jest.fn() } })
      ),
      RECORDING_OPTIONS_PRESET_HIGH_QUALITY: {},
    },
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), unloadAsync: jest.fn() } })),
    },
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
}));

// ── 模拟 expo-speech ──
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

// ── 模拟 @react-native-async-storage/async-storage ──
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// ── 模拟 expo-router ──
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  Stack: { Screen: () => null },
}));

// ── 模拟 react-native-safe-area-context ──
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ── 模拟 react-native-reanimated ──
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ── 全局超时 ──
jest.setTimeout(15000);
