import { Request, Response } from 'express';

export const getNews = async (req: Request, res: Response) => {
  try {
    res.json({
      news: [
        {
          id: "1",
          title: "Market Update",
          summary: "Global markets remain stable",
          source: "Forex Factory",
          publishedAt: "2026-01-01T00:00:00Z"
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};
