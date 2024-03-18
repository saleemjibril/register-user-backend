import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoURL = process.env.REACT_APP_DEV_DB


mongoose.connect(mongoURL, { useUnifiedTopology: true, useNewUrlParser: true })

const db = mongoose.connection

db.on('connected', () => {
  console.log(`DB connection Successful`)
})

db.on('error', () => {
  console.log(`DB connection Failed`)
})

export default mongoose
