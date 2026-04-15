import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { generateOpenRouterRecipe } from "./src/lib/openrouter.server";
import { generateCoquiSpeech } from "./src/lib/coqui-tts.server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Log all requests to debug 405 issues
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // API Routes
  app.post("/api/recipe/generate", async (req, res) => {
    console.log("POST /api/recipe/generate received", req.body);
    const { query, language } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    try {
      const recipe = await generateOpenRouterRecipe(query, language);
      res.json(recipe);
    } catch (error) {
      console.error("OpenRouter Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Handle other methods for the same route to avoid generic 405s
  app.all("/api/recipe/generate", (req, res) => {
    console.warn(`405 Method Not Allowed: ${req.method} on ${req.path}`);
    res.status(405).json({ error: `Method ${req.method} not allowed on this endpoint` });
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
