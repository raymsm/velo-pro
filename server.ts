import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Weather Proxy
  app.get("/api/weather", async (req, res) => {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing lat/lon parameters" });
    }

    try {
      console.log(`Fetching weather for: ${lat}, ${lon}`);
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Weather API error response:", errorText);
        return res.status(response.status).json({ error: "Weather API failed", details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Weather Proxy Error:", error);
      res.status(500).json({ error: "Weather fetch failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
