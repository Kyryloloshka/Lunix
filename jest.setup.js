// Reanimated 4 needs the native worklets runtime, which Jest (jest-expo native preset) can't load.
// Model tests never animate, so a small synchronous stand-in for the APIs the app uses is enough.
jest.mock('react-native-reanimated', () => {
  const { Image, ScrollView, Text, View } = require('react-native');
  const identity = (value) => value;
  const curve = () => identity;
  const Easing = {
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    bezier: curve,
    in: curve,
    out: curve,
    inOut: curve,
  };
  const Animated = {
    View,
    Text,
    Image,
    ScrollView,
    createAnimatedComponent: identity,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    Easing,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (factory) => factory(),
    useAnimatedProps: (factory) => factory(),
    useDerivedValue: (factory) => ({ value: factory() }),
    withTiming: (value, _config, callback) => {
      callback?.(true);
      return value;
    },
    withSpring: (value, _config, callback) => {
      callback?.(true);
      return value;
    },
    withDelay: (_delay, value) => value,
    withSequence: (...values) => values[values.length - 1],
    withRepeat: (value) => value,
    cancelAnimation: () => {},
    isSharedValue: () => false,
    runOnJS: (fn) => fn,
  };
});

// Component tests import stores that persist through AsyncStorage; use the library's official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Haptics are an optional enhancement with no native module in Jest.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Official gesture-handler mocks (native module, detectors) so GestureDetector mounts in Jest.
require('react-native-gesture-handler/jestSetup');
