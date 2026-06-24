import express from 'express';
import { getEconomicCalendar } from '../controllers/economicCalendarController';

const router = express.Router();

router.get('/', getEconomicCalendar);

export default router;
