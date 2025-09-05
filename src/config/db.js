// src/config/db.js
import mongoose from 'mongoose';

export default async (uri) => {
  await mongoose.connect(uri);
  mongoose.connection.on('error', (e) => console.error('Mongo error:', e));
  console.log('MongoDB connected');
};