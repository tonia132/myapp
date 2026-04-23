// vite.config.js
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

/**
 * ✅ 固定綁定區網 IP 的 Vite 設定
 * - 固定網站位置：http://192.168.20.132:5173
 * - 保留多環境（development / production）
 * - 保留 .env 讀取
 * - 保留 alias、proxy、build 最佳化
 *
 * ✅ 重要：
 * 1. 這裡固定 host = 192.168.20.132
 * 2. 這裡固定 port = 5173
 * 3. strictPort = true，避免被占用時自動跳別的 port
 * 4. /api 與 /uploads 都轉發到後端
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const target = env.VITE_PROXY_TARGET || "http://localhost:8080";
  const fixedHost = "192.168.20.132";
  const fixedPort = 5173;

  return {
    plugins: [vue()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: fixedHost,
      port: fixedPort,
      strictPort: true,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      host: fixedHost,
      port: fixedPort,
      strictPort: true,
    },

    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "esbuild",
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ["vue", "vue-router"],
            element: ["element-plus"],
          },
        },
      },
    },
  };
});