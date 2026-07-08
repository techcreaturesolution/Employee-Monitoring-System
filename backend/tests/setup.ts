process.env.JWT_SECRET = 'super_secret_test_key_minimum_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'super_secret_refresh_test_key_minimum_32_characters_long';
process.env.SUPER_ADMIN_PASSWORD = 'password123';
process.env.SUPER_ADMIN_EMAIL = 'admin@example.com';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'; // placeholder
process.env.MONGOMS_PLATFORM = 'win32';
process.env.MONGOMS_ARCH = 'x64';
process.env.MONGOMS_VERSION = '6.0.14'; // Force stable MongoDB version


import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Override MONGODB_URI with the in-memory server URI
  process.env.MONGODB_URI = uri;
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});
