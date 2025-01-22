import express from 'express';
import { upload, remove } from '../controllers/cloudinaryController.js';

const router = express.Router();

router.post('/upload', upload)

router.post('/remove', remove)


export default router;
