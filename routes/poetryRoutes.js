import express from 'express';
import { updatePoem, createPoem, getAllPoems, deletePoem, getPoem } from '../controllers/poetryController.js';
import {protect} from '../controllers/authController.js';

const router = express.Router();

// router.route('/').put(protect, updateImage)
router.route('/').post(protect, createPoem)

router.put('/:id', updatePoem)

router.route('/').put(protect, updatePoem)

router.get('/', getAllPoems)
router.get('/:id', getPoem)
router.route('/:id').delete(protect, deletePoem)



export default router;
