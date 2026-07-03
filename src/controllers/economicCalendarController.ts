import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fetchForexCalendar } from '../providers/forexCalendarProvider';

const DATA_DIR = path.join(process.cwd(), 'data');
const CALENDAR_FILE = path.join(DATA_DIR, 'economicCalendar.json');

async function readStoredCalendar() {
  try {
    const raw = await fs.readFile(CALENDAR_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.calendar) ? parsed.calendar : parsed;
  } catch (err) {
    return null;
  }
}

export const getEconomicCalendar = async (req: Request, res: Response) => {
  try {
    const stored = await readStoredCalendar();
    const refresh = String(req.query.refresh || 'false').toLowerCase() === 'true';
    const timezone = String(req.query.target_timezone || req.query.timezone || 'America/New_York');

    if (!refresh && stored && stored.length > 0) {
      return res.json({ calendar: stored });
    }

    try {
      const fetched = await fetchForexCalendar(timezone);
      if (fetched.length > 0) {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(CALENDAR_FILE, JSON.stringify({ calendar: fetched }, null, 2), 'utf8');
        return res.json({ calendar: fetched });
      }
    } catch (fetchError) {
      console.warn('[EconomicCalendar] remote fetch failed:', fetchError);
    }

    if (stored && stored.length > 0) {
      return res.json({ calendar: stored });
    }

    res.json({
      calendar: [
        {
          id: '1',
          country: 'US',
          event: 'Non Farm Payroll',
          impact: 'High',
          date: '2026-01-01T00:00:00Z'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch economic calendar' });
  }
};

export const importEconomicCalendar = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    // Accept either { calendar: [...] } or an array directly
    const calendar = Array.isArray(payload) ? payload : payload.calendar || payload?.data || null;
    if (!calendar || !Array.isArray(calendar)) {
      return res.status(400).json({ error: 'Invalid payload. Expected { calendar: [ ... ] }' });
    }

    // Ensure data dir exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CALENDAR_FILE, JSON.stringify({ calendar }, null, 2), 'utf8');

    res.json({ success: true, calendar });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to import calendar' });
  }
};
