import mongoose from 'mongoose';
import fs from 'fs';
import { parseEnv } from 'node:util';

const envContent = fs.readFileSync('./.env', 'utf8');
const env = parseEnv(envContent);

export default async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URL);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}
