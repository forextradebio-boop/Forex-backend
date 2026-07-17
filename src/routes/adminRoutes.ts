import { Router } from 'express';
import {
  getAdminDashboardData,
  approveKyc,
  rejectKyc,
  approveWithdrawal,
  rejectWithdrawal,
  adminWalletControl,
  adminUserControl,
  getAllUsers,
  getKycRequests,
  getWithdrawals,
  getSymbols,
  createSymbol,
  updateSymbolStatus,
  modifySymbol,
  createNews,
  dispatchNotification,
  forceCloseTrade,
  getMarketSettings,
  updateMarketSettings,
  clearUserHistory,
  getUserDetails,
  updatePlatformTradingStatus,
  updatePlatformGraphStatus,
  updatePlatformMarketStatus,
  getAllTrades,
  cancelPendingOrder,
  getHistoryRecords,
  archiveRecord,
  restoreRecord,
  softDeleteRecord,
  hardDeleteRecord
} from '../controllers/adminController';
import {
  getAllDeposits,
  getDepositById,
  approveDeposit,
  rejectDeposit,
  blockDeposit,
  deleteDeposit
} from '../controllers/adminDepositController';
import { protect, admin } from '../middleware/authMiddleware';

const router = Router();
router.use(protect, admin);

router.get('/dashboard', getAdminDashboardData);

// Admin list endpoints
router.get('/users', getAllUsers);
router.get('/users/:id/details', getUserDetails);
router.get('/kyc', getKycRequests);
router.get('/withdrawals', getWithdrawals);
router.get('/symbols', getSymbols);
router.get('/trades', getAllTrades);
router.delete('/orders/:id', cancelPendingOrder);

// Deposit Actions
router.get('/deposits', getAllDeposits);
router.get('/deposits/:id', getDepositById);
router.patch('/deposits/:id/approve', approveDeposit);
router.patch('/deposits/:id/reject', rejectDeposit);
router.patch('/deposits/:id/block', blockDeposit);
router.delete('/deposits/:id', deleteDeposit);

// KYC Actions
router.post('/kyc/:id/approve', approveKyc);
router.post('/kyc/:id/reject', rejectKyc);

// Withdrawal Actions
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);

// Market and symbol management
router.post('/symbols', createSymbol);
router.post('/symbols/:symbol/status', updateSymbolStatus);
router.post('/symbols/:symbol/modify', modifySymbol);

// News and notifications
router.post('/news', createNews);
router.post('/notifications', dispatchNotification);

// Trade control
router.post('/trades/force-close/:posId', forceCloseTrade);

// Global Market Settings
router.get('/market-settings', getMarketSettings);
router.put('/market-settings', updateMarketSettings);

// Platform Global Controls
router.get('/platform/status', getMarketSettings);
router.patch('/platform/trading-status', updatePlatformTradingStatus);
router.patch('/platform/graph-status', updatePlatformGraphStatus);
router.patch('/platform/market-status', updatePlatformMarketStatus);

// History & Archive Routes
router.get('/history/:type', getHistoryRecords);
router.patch('/history/:type/:id/archive', archiveRecord);
router.patch('/history/:type/:id/restore', restoreRecord);
router.delete('/history/:type/:id/soft', softDeleteRecord);
router.delete('/history/:type/:id/hard', hardDeleteRecord);

// User History
router.delete('/users/:id/history', clearUserHistory);

// Control Actions
router.post('/wallet', adminWalletControl);
router.post('/user', adminUserControl);

export default router;
