import express from 'express';
import { getAllMedia, getMedia, updateMedia, uploadMedia } from '../controllers/mediaController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

router.route('/').post(protect, uploadMedia)

router.route('/').put(protect, updateMedia)

router.get('/', getAllMedia)
router.get('/:id', getMedia)


export default router;
