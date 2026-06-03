import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;
import dotenv from "dotenv";
import cors from "cors"; // Import the cors middleware
import { connectToDatabase } from "./lib/db.js";
import authRoutes from "./routes/auth.js";
import roadmapRoutes from "./routes/roadmaps.js";
import {
  generateRoadmap,
  getIntroText,
  testEndpoint,
} from "./controllers/aiController.js";

dotenv.config();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://ruta.up.railway.app",
  "https://ruta-one.vercel.app",
  "https://ruta-one.vercel.app/"
];

const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json()); // Enable parsing of JSON request bodies (if needed) 

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/roadmaps", roadmapRoutes);

app.post("/get-intro-text", getIntroText);

app.post("/generate", generateRoadmap);

app.get("/test", testEndpoint);

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  await connectToDatabase(); 

  app.listen(PORT, () => {
    console.log("I am alive");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
