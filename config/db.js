import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';

dotenv.config();

const mongoURL = process.env.REACT_APP_DEV_DB;

mongoose.connect(mongoURL, { useUnifiedTopology: true, useNewUrlParser: true });

const db = mongoose.connection;

db.on('connected', async () => {
  console.log(`✅ DB connection Successful`);
  
  try {
    console.log('📊 Synchronizing database indexes...');
    
    const startTime = Date.now();
    
    // Now that we fixed the schema conflicts, syncIndexes should work
    await User.syncIndexes();
    
    const endTime = Date.now();
    console.log(`✅ Indexes synchronized successfully in ${endTime - startTime}ms`);
    
    // Optional: Show index count
    try {
      const stats = await User.collection.stats();
      console.log(`📊 Collection has ${stats.nindexes} indexes`);
    } catch (statsError) {
      console.log('📊 Index count check skipped');
    }
    
  } catch (error) {
    console.error('❌ Index synchronization failed:', error.message);
    
    if (error.code === 86) {
      console.log('💡 Tip: Try dropping all indexes manually in MongoDB and restart the app');
    } else if (error.code === 11000) {
      console.log('💡 Tip: You have duplicate data preventing unique index creation');
    }
    
    console.log('ℹ️  Application will continue running');
  }
});

db.on('error', (error) => {
  console.log(`❌ DB connection Failed:`, error.message);
});

db.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

db.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.log('❌ Error closing connection:', error.message);
  }
  process.exit(0);
});

export default mongoose;