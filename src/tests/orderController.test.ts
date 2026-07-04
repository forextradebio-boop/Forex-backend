import { createOrder } from '../controllers/orderController';
import { OrderModel } from '../models/Order';
import { Request, Response } from 'express';

jest.mock('../models/Order');

describe('Order Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    req = {
      user: { id: 'user123' },
      body: {}
    } as any;
    res = {
      status: statusMock,
      json: jsonMock
    };
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should correctly map targetPrice from the request body to the database', async () => {
      // Setup payload
      req.body = {
        symbol: 'EURUSD',
        type: 'BUY',
        volume: 1.5,
        targetPrice: 1.1000
      };

      // Mock database return
      const mockCreatedOrder = { _id: 'order1', ...req.body };
      (OrderModel.create as jest.Mock).mockResolvedValue(mockCreatedOrder);

      // Execute controller
      await createOrder(req as Request, res as Response);

      // Verify the DTO mapped `targetPrice` correctly
      expect(OrderModel.create).toHaveBeenCalledWith({
        userId: 'user123',
        symbol: 'EURUSD',
        type: 'BUY',
        volume: 1.5,
        price: undefined,
        targetPrice: 1.1000,
        status: 'PENDING'
      });

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockCreatedOrder);
    });

    it('should correctly fallback targetPrice to price if targetPrice is not explicitly provided', async () => {
      // Setup payload
      req.body = {
        symbol: 'GBPUSD',
        type: 'SELL',
        volume: 2.0,
        price: 1.2500
      };

      // Mock database return
      const mockCreatedOrder = { _id: 'order2', ...req.body, targetPrice: 1.2500 };
      (OrderModel.create as jest.Mock).mockResolvedValue(mockCreatedOrder);

      // Execute controller
      await createOrder(req as Request, res as Response);

      // Verify the DTO mapped fallback logic
      expect(OrderModel.create).toHaveBeenCalledWith({
        userId: 'user123',
        symbol: 'GBPUSD',
        type: 'SELL',
        volume: 2.0,
        price: 1.2500,
        targetPrice: 1.2500,
        status: 'PENDING'
      });
    });
  });
});
