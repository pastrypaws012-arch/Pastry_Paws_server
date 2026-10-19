import express from 'express';
import { Order } from '../models/Order.js';

const router = express.Router();

// GET all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: orders.length, data: orders });
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

// PATCH update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
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

export default router;
