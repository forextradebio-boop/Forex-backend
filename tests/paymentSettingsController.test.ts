jest.mock('../src/models/PaymentSettings', () => ({
  PaymentSettingsModel: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { PaymentSettingsModel } from '../src/models/PaymentSettings';
import { updatePaymentSettings } from '../src/controllers/paymentSettingsController';

describe('updatePaymentSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the uploaded QR image and URL when a non-QR settings update is saved', async () => {
    const existingSettings = {
      qrImage: 'https://example.com/uploads/qr-1.png',
      qrCodeUrl: 'https://example.com/uploads/qr-1.png',
      upiEnabled: true,
    };

    (PaymentSettingsModel.findOne as jest.Mock).mockResolvedValue(existingSettings);
    (PaymentSettingsModel.findOneAndUpdate as jest.Mock).mockResolvedValue({
      ...existingSettings,
      merchantName: 'Alpha Trading',
    });

    const req: any = {
      body: {
        merchantName: 'Alpha Trading',
      },
    };

    const res: any = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updatePaymentSettings(req, res);

    expect(PaymentSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
      {},
      {
        $set: expect.objectContaining({
          merchantName: 'Alpha Trading',
          qrImage: 'https://example.com/uploads/qr-1.png',
          qrCodeUrl: 'https://example.com/uploads/qr-1.png',
        }),
      },
      { new: true }
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});
