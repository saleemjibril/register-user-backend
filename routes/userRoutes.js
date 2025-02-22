import express from 'express';
import { 
  updateUser, 
  createUser, 
  deleteUser, 
  getUser, 
  getUsers, 
  getUserByParams, 
  getUsersNumbers, 
  recordMeal,
  downloadUsersExcel,
  getDailyMealTotals
} from '../controllers/userController.js';

const router = express.Router();

router.post('/', createUser)
router.put('/:id', updateUser)
router.put('/', updateUser)
router.get('/', getUsers)
router.get('/search', getUserByParams)
router.get('/numbers', getUsersNumbers)
router.get('/download', downloadUsersExcel);
router.get('/meals', getDailyMealTotals);
router.get('/:id', getUser)
router.delete('/:id', deleteUser)

router.post('/:userId/meals', recordMeal)



export default router;