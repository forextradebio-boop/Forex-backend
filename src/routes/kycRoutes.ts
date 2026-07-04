import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { submitKyc, getKyc, uploadKycFiles } from '../controllers/kycController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);

// ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'kyc');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
		cb(null, unique);
	}
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// upload endpoint (multipart/form-data) - field name `files`
router.post('/upload', upload.array('files', 6), uploadKycFiles);
router.post('/', submitKyc);
router.get('/', getKyc);

export default router;
