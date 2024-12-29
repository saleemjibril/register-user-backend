import express from 'express';
import bodyParser from'body-parser';
import cors from 'cors';
import './config/db.js';
import allMyRoutes from './allMyRoutes.js';


const app = express();

const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json({
  limit: '200mb'
}));
app.use("/api/v1", allMyRoutes);



app.listen(8000, () => {
  console.log('Server started on port 8000');
});