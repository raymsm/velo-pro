import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Route for Smart Insights
  app.post("/api/insights", async (req, res) => {
    try {
      const { rides, customPrompt } = req.body;
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      let prompt = customPrompt;
      if (!customPrompt) {
        prompt = `Analyze these bike ride stats and provide 3 short, punchy "pro-tips" for improving fuel/energy economy or route efficiency. Keep it technical and cool.
        Stats: ${JSON.stringify(rides.map((r: any) => ({ d: r.distance, f: r.fuelAdded, c: r.fuelCost })))}
        Format as a JSON array of strings.`;
      } else {
        prompt = `You are VELOTRAX L4, a professional bike telemetry AI. Answer the following rider query concisely and with a technical/tactical tone.
        Context: The rider has ${rides.length} recorded sessions.
        Query: ${customPrompt}`;
      }

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      
      const text = result.text;
      
      if (!customPrompt) {
        // Basic cleanup of markdown if model adds it
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json({ insights: JSON.parse(jsonStr) });
      } else {
        res.json({ text });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Weather Proxy
  app.get("/api/weather", async (req, res) => {
    const { lat, lon } = req.query;
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m&models=best_match`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Weather fetch failed" });
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
