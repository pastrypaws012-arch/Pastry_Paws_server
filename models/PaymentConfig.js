import mongoose from 'mongoose';

const paymentConfigSchema = new mongoose.Schema(
  {
    upiId: {
      type: String,
      required: true,
      trim: true,
      default: '9790983844@okaxis',
    },
    payeeName: {
      type: String,
      required: true,
      trim: true,
      default: 'Pastry Paws',
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      default: '9790983844',
    },
    whatsappNumber: {
      type: String,
      required: false,
      trim: true,
      default: '919790983844',
    },
    qrCodeImage: {
      type: String,
      default: '',
    },
    qrCodePublicId: {
      type: String,
      default: '',
    },
    qrMode: {
      type: String,
      enum: ['dynamic', 'custom'],
      default: 'dynamic', // 'dynamic' auto-generates QR with order amount & UPI ID, 'custom' renders uploaded standee QR image
    },
    instructions: {
      type: String,
      default:
        'Pay using Google Pay, PhonePe, Paytm, or BHIM. Take a screenshot of the successful payment screen and note down the 12-digit UPI UTR / Transaction ID.',
    },
  },
  { timestamps: true }
);

export const PaymentConfig = mongoose.model('PaymentConfig', paymentConfigSchema);
