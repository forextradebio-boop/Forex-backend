import { Request, Response } from 'express';

export const getEconomicCalendar = async (req: Request, res: Response) => {
  try {
    res.json({
      calendar: [
        {
          id: "1",
          country: "US",
          event: "Non Farm Payroll",
          impact: "High",
          date: "2026-01-01T00:00:00Z"
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch economic calendar' });
  }
};
