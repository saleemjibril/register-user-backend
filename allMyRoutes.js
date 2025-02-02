import express from 'express';
const router = express.Router();
import userRoutes from './routes/userRoutes.js'
import cloudinaryRoutes from './routes/cloudinaryRoutes.js'
import authRoutes from './routes/authRoutes.js'

router.use("/user",  userRoutes);
router.use("/files",  cloudinaryRoutes);
router.use("/auth",  authRoutes);



export default router
