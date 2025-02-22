import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import './config/db.js'; // Ensure this is correctly set up
import allMyRoutes from './allMyRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use("/api/v1", allMyRoutes);



// Export the Express app as a function
// Export the Express app as a function
export default app;
