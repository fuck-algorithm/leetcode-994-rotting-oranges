import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        plugins: [react()],
        // GitHub Pages 部署时使用仓库名作为 base 路径
        base: mode === 'production' ? '/leetcode-994-rotting-oranges/' : '/',
        server: {
            port: 40889
        }
    });
});
