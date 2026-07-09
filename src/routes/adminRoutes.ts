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
  toggleSymbol,
  modifySymbol,
  createNews,
  dispatchNotification,
  forceCloseTrade
} from '../controllers/adminController';
import {
  getAllDeposits,
  getDepositById,
  approveDeposit,
  rejectDeposit
} from '../controllers/adminDepositController';
import { protect, admin } from '../middleware/authMiddleware';

const router = Router();
router.use(protect, admin);

router.get('/dashboard', getAdminDashboardData);

// Admin list endpoints
router.get('/users', getAllUsers);
router.get('/kyc', getKycRequests);
router.get('/withdrawals', getWithdrawals);
router.get('/symbols', getSymbols);

// Deposit Actions
router.get('/deposits', getAllDeposits);
router.get('/deposits/:id', getDepositById);
router.patch('/deposits/:id/approve', approveDeposit);
router.patch('/deposits/:id/reject', rejectDeposit);

// KYC Actions
router.post('/kyc/:id/approve', approveKyc);
router.post('/kyc/:id/reject', rejectKyc);

// Withdrawal Actions
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);

// Market and symbol management
router.post('/symbols', createSymbol);
router.post('/symbols/:symbol/toggle', toggleSymbol);
router.post('/symbols/:symbol/modify', modifySymbol);

// News and notifications
router.post('/news', createNews);
router.post('/notifications', dispatchNotification);

// Trade control
router.post('/trades/force-close/:posId', forceCloseTrade);

// Control Actions
router.post('/wallet', adminWalletControl);
router.post('/user', adminUserControl);

export default router;
