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
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
  };
});
