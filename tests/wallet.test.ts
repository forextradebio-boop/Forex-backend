import mongoose from 'mongoose';
import { WalletModel } from '../src/models/Wallet';

describe('Wallet Model Tests', () => {
  beforeAll(async () => {
    // Connect to a test db, or we can just unit test the mongoose validation directly
    // Since this might not be run in a live mongo context, we'll just test the hooks via dummy objects.
    // However, Mongoose pre-save hooks require saving to DB. We will just test validation logic.
  });

  afterAll(async () => {
    // cleanup
  });

  it('should enforce 2 decimal rounding and non-negative free margin on save', async () => {
    const wallet = new WalletModel({
      userId: new mongoose.Types.ObjectId(),
      balance: 100.1234,
      equity: 150.987,
      margin: 200.0,
      pnl: 50.863
    });

    // We can simulate pre-save by calling validate or manually running the hook logic.
    // For a real DB test, we'd need MongoMemoryServer. 
    // Let's assume we mock the save.
    const err = wallet.validateSync();
    
    // We will just verify the schema constraints
    expect(wallet.balance).toBe(100.1234); // Hasn't saved yet

    // We can call the save hook manually for testing if no DB
    const next = jest.fn();
    // @ts-ignore
    WalletModel.schema.s.hooks.execPreSync('save', wallet);

    expect(wallet.balance).toBe(100.12);
    expect(wallet.equity).toBe(150.99);
    expect(wallet.margin).toBe(200.00);
    expect(wallet.pnl).toBe(50.86);

    // Free margin should be Math.max(0, equity - margin)
    // 150.99 - 200.00 = -49.01 -> clamped to 0
    expect(wallet.freeMargin).toBe(0);
  });
});
