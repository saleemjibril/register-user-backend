import express from 'express';
import { createTestimonial, updateTestimonial, getAllTestimonials, deleteTestimonial, getTestimonial } from '../controllers/testimonialController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

router.route('/').post(protect, createTestimonial)

router.route('/:id').put(protect, updateTestimonial)

router.get('/', getAllTestimonials)
router.get('/:id', getTestimonial)
router.route('/:id').delete(protect, deleteTestimonial)



export default router;
