import express from 'express';
import { 
  createInventory,
  getAllInventory,
  getInventoryById,
  getInventorySummary,
  updateInventory,
  deleteInventory,
  addDistribution,
  adjustStock,
  getLowStockItems,
  getInventoryByBatch,
  bulkCreateInventory,
  getInventoryStats,
  exportInventoryExcel,
  distributePadToStudent,
  getStudentDistributionHistory,
  checkStudentEligibility,
  getDailyDistributionReport,
  getPadDistributionInsights
} from '../controllers/inventoryController.js';

const router = express.Router();

// Main CRUD routes
router.post('/', createInventory);
router.get('/', getAllInventory);
router.get('/summary', getInventorySummary);
router.get('/low-stock', getLowStockItems);
router.get('/stats', getInventoryStats);
router.get('/export', exportInventoryExcel);
router.get('/batch/:batchId', getInventoryByBatch);
router.get('/:id', getInventoryById);
router.put('/:id', updateInventory);
router.delete('/:id', deleteInventory);

// Bulk operations
router.post('/bulk', bulkCreateInventory);

// Distribution and stock management
router.post('/:id/distribute', addDistribution);
router.post('/:id/adjust', adjustStock);

// Distribution/Checkout routes
router.post('/distribute', distributePadToStudent);
router.get('/student/:studentUserId/history', getStudentDistributionHistory);
router.get('/student/:studentUserId/eligibility', checkStudentEligibility);
router.get('/reports/daily', getPadDistributionInsights);
// router.get('/reports', getPadDistributionInsights);


export default router;