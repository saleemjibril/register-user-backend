import express from 'express';
import { getBio, updateBio } from '../controllers/bioController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

router.route('/:id').put(protect, updateBio)
router.get('/', getBio)


export default router;
