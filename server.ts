import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { generateOpenRouterRecipe, enhanceRecipeWithOpenRouter } from "./src/lib/openrouter.server.ts";
import { generateCoquiSpeech } from "./src/lib/coqui-tts.server.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());
    
    // Serve public folder statically
    app.use(express.static(path.join(process.cwd(), "public")));

    // Log all requests with more detail
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    // API Routes
    app.post("/api/recipe/generate", async (req, res) => {
      console.log("Handling POST /api/recipe/generate");
      const { query, language, baseRecipe } = req.body;
      if (!query && !baseRecipe) {
        return res.status(400).json({ error: "Query or baseRecipe is required" });
      }
      try {
        let recipe;
        if (baseRecipe) {
          console.log("Enhancing base recipe from TheMealDB");
          recipe = await enhanceRecipeWithOpenRouter(baseRecipe, language);
        } else {
          console.log("Generating recipe from scratch via OpenRouter");
          recipe = await generateOpenRouterRecipe(query, language);
        }
        res.json(recipe);
      } catch (error) {
        console.error("OpenRouter Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });

    app.post("/api/tts/coqui", async (req, res) => {
      const { text, language } = req.body;
      try {
        const audio = await generateCoquiSpeech(text, language);
        if (audio) {
          res.json({ audio });
        } else {
          res.status(500).json({ error: "Failed to generate Coqui speech" });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // Determine if in production or dev
    const isProd = process.env.NODE_ENV === "production" || process.env.K_SERVICE !== undefined;

    if (!isProd) {
      console.log("Starting in DEVELOPMENT mode with Vite middleware");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Starting in PRODUCTION mode serving built assets");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT} in ${isProd ? "production" : "development"} mode`);
    });
  } catch (error) {
    console.error("CRITICAL: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
