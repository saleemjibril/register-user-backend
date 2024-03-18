import express from 'express';
import { upload, remove } from '../controllers/cloudinaryController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

router.route('/upload').post(protect, upload)

router.route('/remove').post(protect, remove)


export default router;
