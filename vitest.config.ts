import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // tsconfig 的 "jsx": "preserve" 是给 Next 编译用的；vitest（Vite 8 + Oxc）引入
  // .tsx 组件时必须自己编译 JSX，否则组件测试会在解析阶段失败。
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
