import express from 'express';
const router = express.Router();
import userRoutes from './routes/userRoutes.js'
import cloudinaryRoutes from './routes/cloudinaryRoutes.js'

router.use("/user",  userRoutes);
router.use("/files",  cloudinaryRoutes);



export default router
