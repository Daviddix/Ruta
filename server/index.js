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

app.use(cors()); // Enable CORS for all routes (or configure for specific origins)
app.use(express.json()); // Enable parsing of JSON request bodies (if needed) 

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/roadmaps", roadmapRoutes);

app.post("/get-intro-text", getIntroText);

app.post("/generate", generateRoadmap);

app.get("/test", testEndpoint);

async function startServer() {
  await connectToDatabase(); 

  app.listen(PORT, () => {
    console.log("I am alive");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
