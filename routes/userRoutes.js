import express from 'express';
import { updateUser, createUser, deleteUser, getUser, getUsers, getUserByParams } from '../controllers/userController.js';

const router = express.Router();

// router.route('/').put(protect, updateImage)
router.post('/', createUser)

router.put('/:id', updateUser)

router.put('/', updateUser)

router.get('/', getUsers)
router.get('/search', getUserByParams)
router.get('/:id', getUser)
router.delete('/:id', deleteUser)



export default router;
