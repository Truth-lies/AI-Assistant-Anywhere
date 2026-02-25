module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      [
        'babel-preset-expo',
        // 在 Jest 测试环境中禁用 react-native-reanimated/plugin
        // （该插件依赖 react-native-worklets，在 Node.js 测试环境不可用）
        isTest ? { reanimated: false } : {},
      ],
    ],
    plugins: [
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
