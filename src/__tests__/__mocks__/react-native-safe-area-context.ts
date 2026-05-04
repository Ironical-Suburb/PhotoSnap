const { View } = require('react-native');
const React = require('react');

const SafeAreaProvider = ({ children }: any) => React.createElement(View, null, children);
const SafeAreaView = ({ children, ...props }: any) => React.createElement(View, props, children);
const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 390, height: 844 });

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics: { insets: { top: 0, right: 0, bottom: 0, left: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } },
};
