import express from 'express';
import { updateEvent, createEvent, getAllEvents, deleteEvent, getEvent } from '../controllers/eventController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

// router.route('/').put(protect, updateImage)
router.route('/').post(protect, createEvent)

router.put('/:id', updateEvent)

router.route('/').put(protect, updateEvent)

router.get('/', getAllEvents)
router.get('/:id', getEvent)
router.route('/:id').delete(protect, deleteEvent)



export default router;
