import mongoose from 'mongoose';
import { config } from './index';

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
      w: 'majority',
      retryWrites: true,
      retryReads: true,

      // Data compression
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
    });

    console.log(`✅  MongoDB connected  →  ${conn.connection.host}`);
  } catch (error) {
    console.error('❌  MongoDB connection failed:', (error as Error).message);
    console.error('   Check that MongoDB is running and MONGODB_URI is correct in .env');
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () =>
  console.warn('⚠️  MongoDB disconnected — attempting to reconnect...')
);
mongoose.connection.on('reconnected', () =>
  console.log('✅  MongoDB reconnected')
);
mongoose.connection.on('error', (err) =>
  console.error('❌  MongoDB error:', err.message)
);

// Graceful shutdown on Ctrl+C
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('✅  MongoDB connection closed cleanly');
  } catch (err) {
    console.error('   Error closing MongoDB:', err);
  }
  process.exit(0);
});
