import axios from 'axios';
import { MarketService } from '../src/services/market.service';
import { MarketProvider } from '../src/providers/marketProvider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MarketService.getHistoricalCandles', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    (MarketService as unknown as { candleCache: Map<string, { value: any; expiresAt: number }> }).candleCache.clear();
  });

  it('parses Yahoo Finance chart payloads with timestamp and quote indicators', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        chart: {
          result: [
            {
              timestamp: [1704067200, 1704153600],
              indicators: {
                quote: [
                  {
                    open: [1.1, 2.2],
                    high: [1.3, 2.4],
                    low: [1.0, 2.0],
                    close: [1.2, 2.3],
                    volume: [100, 200],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const candles = await MarketService.getHistoricalCandles('EURUSD');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD%3DX',
      expect.objectContaining({
        params: expect.objectContaining({ interval: '1d', range: '1y' }),
      })
    );

    expect(candles).toEqual([
      { time: 1704067200, open: 1.1, high: 1.3, low: 1.0, close: 1.2, volume: 100 },
      { time: 1704153600, open: 2.2, high: 2.4, low: 2.0, close: 2.3, volume: 200 },
    ]);
  });

  it('uses GoldAPI for XAUUSD quotes when configured', async () => {
    process.env.GOLDAPI_KEY = 'goldapi-test-key';

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        price: 2050.75,
        bid: 2050.7,
        ask: 2050.8,
        prev_close: 2045.0,
        high: 2060.0,
        low: 2038.0,
        open: 2048.0,
        volume: 1234,
        timestamp: 1710000000,
      },
    });

    const quote = await MarketProvider.fetchQuote('XAUUSD');

    expect(quote.symbol).toBe('XAUUSD');
    expect(quote.price).toBe(2050.75);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.goldapi.io/api/XAU/USD',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-access-token': 'goldapi-test-key',
        }),
      })
    );
  });
});
