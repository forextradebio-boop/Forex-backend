import express from 'express';
import {
  getLatestNews,
  getForexNews,
  getSymbolNews,
  searchNews,
  getArticle,
  getSimilarArticles,
  getNewsSources,
} from '../controllers/newsController';

const router = express.Router();

router.get('/', getLatestNews);
router.get('/forex', getForexNews);
router.get('/search', searchNews);
router.get('/sources', getNewsSources);
router.get('/article/:uuid/similar', getSimilarArticles);
router.get('/article/:uuid', getArticle);
router.get('/:symbol', getSymbolNews);

export default router;
