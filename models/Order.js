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
      default: 'Pay on Delivery / UPI (Simulated)',
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
