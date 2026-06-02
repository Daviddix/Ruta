import mongoose from "mongoose";

export async function connectToDatabase() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  mongoose.set("strictQuery", true);

  try {
    console.log("Connecting to primary database...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Timeout quickly on fail
    });
    console.log("Connected to primary database successfully!");
  } catch (err) {
    console.error("Primary database connection failed:", err.message);
    const localURI = "mongodb://127.0.0.1:27017/ruta";
    console.log(`Attempting to fall back to local database: ${localURI}`);
    try {
      await mongoose.connect(localURI, {
        serverSelectionTimeoutMS: 3000 
      });
      console.log("Connected to local database successfully!");
    } catch (localErr) {
      console.error("Local database connection also failed:", localErr.message);
      console.warn("Server starting WITHOUT active database connection. DB features will be unavailable.");
    }
  }

  return mongoose.connection;
}
