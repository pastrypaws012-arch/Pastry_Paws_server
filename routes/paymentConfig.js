import express from 'express';
import { PaymentConfig } from '../models/PaymentConfig.js';

const router = express.Router();

export const DEFAULT_PAYMENT_CONFIG = {
  upiId: '9790983844@okaxis',
  payeeName: 'Pastry Paws',
  phoneNumber: '9790983844',
  whatsappNumber: '919790983844',
  qrCodeImage: '',
  qrCodePublicId: '',
  qrMode: 'dynamic',
  instructions:
    'Pay using Google Pay, PhonePe, Paytm, or BHIM. Take a screenshot of the successful payment screen and note down the 12-digit UPI UTR / Transaction ID.',
};

// GET /api/payment-config - Fetch authoritative payment details
router.get('/', async (req, res) => {
  try {
    let config = await PaymentConfig.findOne();
    if (!config) {
      config = await PaymentConfig.create(DEFAULT_PAYMENT_CONFIG);
    }
    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    return res.json({
      success: true,
      data: DEFAULT_PAYMENT_CONFIG,
      fallback: true,
    });
  }
});

// PUT /api/payment-config - Update payment details (Admin)
router.put('/', async (req, res) => {
  try {
    const {
      upiId,
      payeeName,
      phoneNumber,
      whatsappNumber,
      qrCodeImage,
      qrCodePublicId,
      qrMode,
      instructions,
    } = req.body;

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid UPI ID is required (e.g. yourname@okaxis).',
      });
    }

    let config = await PaymentConfig.findOne();
    if (!config) {
      config = new PaymentConfig({
        upiId: upiId.trim(),
        payeeName: payeeName ? payeeName.trim() : 'Pastry Paws',
        phoneNumber: phoneNumber ? phoneNumber.trim() : '9790983844',
        whatsappNumber: whatsappNumber ? whatsappNumber.trim() : '919790983844',
        qrCodeImage: qrCodeImage || '',
        qrCodePublicId: qrCodePublicId || '',
        qrMode: qrMode || (qrCodeImage ? 'custom' : 'dynamic'),
        instructions: instructions || DEFAULT_PAYMENT_CONFIG.instructions,
      });
    } else {
      config.upiId = upiId.trim();
      if (payeeName !== undefined) config.payeeName = payeeName.trim();
      if (phoneNumber !== undefined) config.phoneNumber = phoneNumber.trim();
      if (whatsappNumber !== undefined) config.whatsappNumber = whatsappNumber.trim();
      if (qrCodeImage !== undefined) config.qrCodeImage = qrCodeImage;
      if (qrCodePublicId !== undefined) config.qrCodePublicId = qrCodePublicId;
      if (qrMode) config.qrMode = qrMode;
      if (instructions !== undefined) config.instructions = instructions;
    }

    await config.save();

    return res.json({
      success: true,
      message: 'Payment configuration updated successfully!',
      data: config,
    });
  } catch (error) {
    console.error('Error updating payment config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment settings: ' + error.message,
    });
  }
});

export default router;
