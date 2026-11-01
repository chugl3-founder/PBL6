// Mocks cho Jest Testing trong React Native & Expo

global.IS_REACT_ACT_ENVIRONMENT = true;

// 1. Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 2. Mock lucide-react-native (Dùng Proxy để tự động mock tất cả các icons)
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        const MockIcon = (props) =>
          React.createElement(View, { testID: `mock-icon-${String(prop)}`, ...props });
        MockIcon.displayName = String(prop);
        return MockIcon;
      },
    }
  );
});

// 3. Mock expo-video
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({
    playing: false,
    duration: 3600,
    currentTime: 0,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  VideoView: 'VideoView',
}));

// 4. Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => React.createElement(View, { testID: 'mock-webview', ...props }),
  };
});

// 5. Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: '192.168.2.149:8081',
  },
}));

// 6. Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Videos: 'Videos' },
}));
