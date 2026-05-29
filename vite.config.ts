import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React 기반 Vite 설정 (정적 SPA, 백엔드 없음)
export default defineConfig({
  plugins: [react()],
});
