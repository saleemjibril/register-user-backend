import express from 'express';
const router = express.Router();
import mediaRouter from './routes/mediaRoutes.js'
import poetryRouter from './routes/poetryRoutes.js'
import bioRouter from './routes/bioRoutes.js'
import testimonialRouter from './routes/testimonialRoutes.js'
import cloudinaryRoutes from './routes/cloudinaryRoutes.js'
import speakingRoutes from './routes/speakingRoutes.js'
import authRoutes from './routes/authRoutes.js'


router.use("/media",  mediaRouter);
router.use("/poetry",  poetryRouter);
router.use("/bio",  bioRouter);
router.use("/testimonial",  testimonialRouter);
router.use("/files",  cloudinaryRoutes);
router.use("/speaking",  speakingRoutes);
router.use("/auth",  authRoutes);

export default router
