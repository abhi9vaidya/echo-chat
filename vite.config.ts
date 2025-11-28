import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
<<<<<<< HEAD
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
=======

// https://vitejs.dev/config/
export default defineConfig(() => ({
>>>>>>> fc4ee4f (Initial commit)
  server: {
    host: "::",
    port: 8080,
  },
<<<<<<< HEAD
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
=======
  plugins: [react()],
>>>>>>> fc4ee4f (Initial commit)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
