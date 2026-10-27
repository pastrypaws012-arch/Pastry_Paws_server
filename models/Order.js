import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryDate: {
      type: String,
      default: '',
    },
    deliveryTime: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    itemTitle: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: '',
    },
    selectedSize: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    selectedAddons: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
        },
      ],
      default: [],
    },
    addonsTotal: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    price: {
      type: String,
      required: true,
    },
    itemImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'baking', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      default: 'Google Pay / UPI',
    },
    paymentStatus: {
      type: String,
      enum: ['pending_verification', 'verified', 'rejected', 'cod_pending'],
      default: 'pending_verification',
    },
    paymentScreenshot: {
      type: String,
      default: '',
    },
    paymentScreenshotPublicId: {
      type: String,
      default: '',
    },
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
    paymentAmount: {
      type: String,
      default: '',
    },
    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
    paymentRejectedReason: {
      type: String,
      default: '',
    },
    cancellationRequested: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    cancellationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'denied'],
      default: 'none',
    },
    cancellationDeniedReason: {
      type: String,
      default: '',
    },
    cancellationRequestedAt: {
      type: Date,
      default: null,
    },
    cancellationResolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
