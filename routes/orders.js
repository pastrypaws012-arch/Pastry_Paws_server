import express from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';

const router = express.Router();

// GET all orders (admin / general)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/track?phone=...
router.get('/track', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required to track orders.',
      });
    }

    // Strip out non-digit characters (+91, spaces, dashes)
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number (at least 5 digits).',
      });
    }

    // Match by last 10 digits or exact substring
    const lookupKey = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    const orders = await Order.find({
      customerPhone: { $regex: lookupKey, $options: 'i' },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      lookupKey,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create dummy order
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryDate,
      deliveryTime,
      notes,
      itemTitle,
      category,
      selectedSize,
      price,
      itemImage,
    } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress || !itemTitle) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, delivery address, and item title are required.',
      });
    }

    const orderId = `PP-${Date.now().toString().slice(-6)}`;

    const newOrder = await Order.create({
      orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryDate: deliveryDate || '',
      deliveryTime: deliveryTime || '',
      notes: notes ? notes.trim() : '',
      itemTitle: itemTitle.trim(),
      category: category || '',
      selectedSize: selectedSize || '',
      price: price || '',
      itemImage: itemImage || '',
      status: 'pending',
      paymentMethod: 'Pay on Delivery / UPI (Simulated)',
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: newOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to find order by _id or orderId safely
const findOrderSafely = async (param) => {
  if (mongoose.isValidObjectId(param)) {
    const byId = await Order.findById(param);
    if (byId) return byId;
  }
  return await Order.findOne({ orderId: param });
};

// PATCH update order status (Admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/orders/:id/request-cancel (Customer Cancellation Request)
// RULE 1: Customer can ONLY request cancellation if status is 'pending'.
// RULE 2: Customer MUST provide a non-empty reason.
// RULE 3: Order does NOT immediately cancel; it is placed in 'pending' cancellation review for admin approval.
router.patch('/:id/request-cancel', async (req, res) => {
  try {
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already "${order.status}". Custom cakes and artisan bakes are prepared to order. Only pending orders can be cancelled. Please contact our studio on WhatsApp for urgent changes.`,
      });
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required to submit a cancellation request.',
      });
    }

    order.cancellationRequested = true;
    order.cancellationStatus = 'pending';
    order.cancellationReason = reason.trim();
    order.cancellationRequestedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Cancellation request submitted to bakery admin for review.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/orders/:id/approve-cancel (Admin approves cancellation)
// RULE: Admin accepts cancel request -> order status becomes 'cancelled', cancellationStatus becomes 'approved'.
// No reason required from admin when approving.
router.patch('/:id/approve-cancel', async (req, res) => {
  try {
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.status = 'cancelled';
    order.cancellationStatus = 'approved';
    order.cancellationResolvedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Order cancellation approved successfully.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/orders/:id/deny-cancel (Admin denies cancellation)
// RULE: Admin denies cancel request -> admin MUST provide a reason.
// Order status stays active, cancellationStatus becomes 'denied'.
router.patch('/:id/deny-cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required from admin when denying a cancellation request.',
      });
    }

    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.cancellationStatus = 'denied';
    order.cancellationDeniedReason = reason.trim();
    order.cancellationResolvedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Cancellation request declined.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compatibility alias for customer-cancel
router.patch('/:id/customer-cancel', async (req, res) => {
  try {
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already "${order.status}".`,
      });
    }
    order.cancellationRequested = true;
    order.cancellationStatus = 'pending';
    order.cancellationReason = req.body.reason || 'Requested by customer';
    order.cancellationRequestedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Cancellation request submitted for review.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
