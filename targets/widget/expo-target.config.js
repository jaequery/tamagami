/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TamaWidget',
  icon: '../../assets/icon.png',
  // Asset-catalog colors available to SwiftUI as Color("$accent") etc.
  colors: {
    $accent: '#9BBC0F', // LCD green
    $widgetBackground: '#0F380F', // darkest LCD
  },
  // Mirror the main app's App Group so the widget can read shared pet state.
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
