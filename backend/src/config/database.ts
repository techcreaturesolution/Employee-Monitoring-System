import mongoose from "mongoose";
import { config } from "./index";

import fs from "fs";
import path from "path";
import { Screenshot } from "../modules/screenshots/Screenshot.model";

const pruneBrokenScreenshots = async (): Promise<void> => {
  try {
    const screenshots = await Screenshot.find({
      imageUrl: { $regex: /^\/uploads/ },
    });
    let deletedCount = 0;

    for (const ss of screenshots) {
      const relativePath = ss.imageUrl.replace(/^\/uploads/, "");
      const filePath = path.join(path.resolve(config.upload.dir), relativePath);

      if (!fs.existsSync(filePath)) {
        await Screenshot.findByIdAndDelete(ss._id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(
        `🧹 Cleaned up ${deletedCount} broken screenshot database entries (files missing on disk).`
      );
    }
  } catch (error) {
    console.error("❌ Failed to prune broken screenshots:", error);
  }
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      // Connection pooling for high concurrency
      maxPoolSize: 20,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,

      // Timeouts
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,

      // Write concern & retries
      w: "majority",
      retryWrites: true,
      retryReads: true,

      // Data compression
      compressors: ["zlib"],
      zlibCompressionLevel: 6,
    });

    console.log(`✅  MongoDB connected  →  ${conn.connection.host}`);
    await pruneBrokenScreenshots();
  } catch (error) {
    console.error("❌  MongoDB connection failed:", (error as Error).message);
    console.error(
      "   Check that MongoDB is running and MONGODB_URI is correct in .env"
    );
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () =>
  console.warn("⚠️  MongoDB disconnected — attempting to reconnect...")
);
mongoose.connection.on("reconnected", () =>
  console.log("✅  MongoDB reconnected")
);
mongoose.connection.on("error", (err) =>
  console.error("❌  MongoDB error:", err.message)
);

// Graceful shutdown on Ctrl+C
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("✅  MongoDB connection closed cleanly");
  } catch (err) {
    console.error("   Error closing MongoDB:", err);
  }
  process.exit(0);
});
