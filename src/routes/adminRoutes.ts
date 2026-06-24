import { Router } from 'express';
import { 
  getAdminDashboardData, 
  approveKyc, 
  rejectKyc,
  approveWithdrawal,
  rejectWithdrawal,
  adminWalletControl,
  adminUserControl
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

// Control Actions
router.post('/wallet', adminWalletControl);
router.post('/user', adminUserControl);

export default router;
