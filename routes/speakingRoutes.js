import express from 'express';
import { createSpeaking, updateSpeaking, getAllSpeakings, getSpeaking, deleteSpeaking } from '../controllers/speakingController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

router.route('/').post(protect, createSpeaking)

router.route('/:id').put(protect, updateSpeaking)

router.get('/', getAllSpeakings)
router.get('/:id', getSpeaking)
router.route('/:id').delete(protect, deleteSpeaking)



export default router;
