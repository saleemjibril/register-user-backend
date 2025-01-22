import express from 'express';
import { updateUser, createUser, deleteUser, getUser } from '../controllers/userController.js';

const router = express.Router();

// router.route('/').put(protect, updateImage)
router.post('/', createUser)

router.put('/:id', updateUser)

router.put('/', updateUser)

// router.get('/', getAllUsers)
router.get('/:id', getUser)
router.delete('/:id', deleteUser)



export default router;
