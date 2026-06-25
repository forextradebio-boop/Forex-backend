import axios from 'axios';

export class NewsService {
  static async getNews(category: string) {
    // In production, connect to a news API (e.g. NewsAPI, Financial Modeling Prep, etc.)
    // We mock the return for demonstration
    return [
      {
        id: 'n1',
        title: `Major Economic Update for ${category}`,
        summary: `Market shows unexpected volatility due to recent announcements in the ${category} sector.`,
        url: '#',
        source: 'Forex Factory Analyst',
        publishedAt: new Date().toISOString()
      },
      {
        id: 'n2',
        title: `${category} Prices Reach Critical Levels`,
        summary: `Traders are closely monitoring key support and resistance zones.`,
        url: '#',
        source: 'Reuters Financial',
        publishedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }
}
