import { Request, Response } from 'express';
import { NewsService } from '../services/newsService';

export const getLatestNews = async (req: Request, res: Response) => {
  try {
    const news = await NewsService.getLatestNews();
    res.json({ news });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch latest news' });
  }
};

export const getForexNews = async (req: Request, res: Response) => {
  try {
    const news = await NewsService.getForexNews();
    res.json({ news });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch forex news' });
  }
};

export const getSymbolNews = async (req: Request, res: Response) => {
  try {
    const symbol = String(req.params.symbol || '');
    const news = await NewsService.getSymbolNews(symbol);
    res.json({ news });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch news for symbol' });
  }
};

export const searchNews = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '');
    const news = await NewsService.searchNews(query);
    res.json({ news });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to search news' });
  }
};

export const getArticle = async (req: Request, res: Response) => {
  try {
    const uuid = String(req.params.uuid || '');
    const article = await NewsService.getArticle(uuid);
    res.json({ article });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch article' });
  }
};

export const getSimilarArticles = async (req: Request, res: Response) => {
  try {
    const uuid = String(req.params.uuid || '');
    const news = await NewsService.getSimilarArticles(uuid);
    res.json({ news });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch similar articles' });
  }
};

export const getNewsSources = async (req: Request, res: Response) => {
  try {
    const sources = await NewsService.getSources();
    res.json({ sources });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch news sources' });
  }
};
