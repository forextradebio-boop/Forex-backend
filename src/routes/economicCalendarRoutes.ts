import express from 'express';
import { getEconomicCalendar, importEconomicCalendar } from '../controllers/economicCalendarController';

const router = express.Router();

router.get('/', getEconomicCalendar);
router.post('/import', importEconomicCalendar);

export default router;
