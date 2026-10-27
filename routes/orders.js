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

// Dummy/Fake transaction ID blocklist for basic sanity check
const FAKE_TX_PATTERNS = [
  /^0+$/,
  /^123456/,
  /^test/i,
  /^fake/i,
  /^dummy/i,
  /^nil$/i,
  /^none$/i,
  /^na$/i,
  /^paid$/i,
  /^gpay$/i,
  /^phonepe$/i,
];

// POST create order with UPI payment details & anti-fraud verification
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryDate,
      deliveryTime,
      notes,
      items, // Multi-item cart array
      itemTitle,
      category,
      selectedSize,
      quantity,
      selectedAddons,
      addonsTotal,
      totalAmount,
      price,
      itemImage,
      paymentMethod,
      paymentScreenshot,
      paymentScreenshotPublicId,
      transactionId,
    } = req.body;

    const hasItemsArray = Array.isArray(items) && items.length > 0;
    const effectiveTitle = hasItemsArray ? items.map((i) => i.itemTitle).join(', ') : itemTitle;

    if (!customerName || !customerPhone || !deliveryAddress || (!effectiveTitle && !hasItemsArray)) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, delivery address, and items are required.',
      });
    }

    const isCOD = paymentMethod === 'Cash on Delivery' || paymentMethod === 'COD';
    let cleanTxId = 'COD';
    let finalPaymentStatus = 'cod_pending';
    let finalPaymentMethod = 'Cash on Delivery';

    if (!isCOD) {
      finalPaymentMethod = 'Google Pay / UPI';
      finalPaymentStatus = 'pending_verification';

      // Payment proof validation for UPI / Online Payments
      if (!paymentScreenshot || !paymentScreenshot.trim()) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_SCREENSHOT',
          message: 'Payment screenshot is required. Please upload the screenshot of your Google Pay / UPI payment.',
        });
      }

      if (!transactionId || !transactionId.trim()) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_TRANSACTION_ID',
          message: 'UPI Transaction ID / UTR number is required. Please paste the reference number from your payment receipt.',
        });
      }

      // Clean transaction ID (remove spaces, uppercase)
      cleanTxId = transactionId.trim().replace(/\s+/g, '').toUpperCase();

      // Validate transaction ID format (minimum 8 characters, maximum 35 characters)
      if (cleanTxId.length < 8 || cleanTxId.length > 35) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TRANSACTION_ID',
          message: 'Please enter a valid UPI Transaction / UTR ID (typically 12 digits, e.g. 429182739102).',
        });
      }

      // Check against obvious fake/dummy inputs
      if (FAKE_TX_PATTERNS.some((pat) => pat.test(cleanTxId))) {
        return res.status(400).json({
          success: false,
          code: 'SUSPICIOUS_TRANSACTION_ID',
          message: 'The entered Transaction ID appears invalid. Please enter the genuine UTR reference number from your UPI app receipt.',
        });
      }

      // ANTI-FRAUD GUARD 1: Prevent duplicate transaction IDs across all non-cancelled orders
      const existingTx = await Order.findOne({
        transactionId: cleanTxId,
        status: { $ne: 'cancelled' },
      });

      if (existingTx) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_TRANSACTION_ID',
          message: `This UPI Transaction ID (${cleanTxId}) has already been used for Order #${existingTx.orderId}. Each order must have its own unique payment transaction.`,
        });
      }

      // ANTI-FRAUD GUARD 2: Prevent duplicate payment screenshot reuse
      const existingScreenshot = await Order.findOne({
        paymentScreenshot: paymentScreenshot.trim(),
        status: { $ne: 'cancelled' },
      });

      if (existingScreenshot) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_SCREENSHOT',
          message: `This payment receipt image was already submitted for Order #${existingScreenshot.orderId}. Please upload the actual payment screenshot for this order.`,
        });
      }
    }

    const orderId = `PP-${Date.now().toString().slice(-6)}`;

    let cleanedItems = [];
    let computedTotalAmount = 0;
    let computedTotalQty = 0;

    if (hasItemsArray) {
      cleanedItems = items.map((it) => {
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const unitP = Math.max(0, parseFloat(String(it.unitPrice || it.price || 0).replace(/[^0-9.]/g, '')) || 0);
        const addons = Array.isArray(it.selectedAddons)
          ? it.selectedAddons
              .map((a) => ({
                name: typeof a.name === 'string' ? a.name.trim() : '',
                price: Math.max(0, parseInt(String(a.price).replace(/[^0-9]/g, ''), 10) || 0),
              }))
              .filter((a) => a.name.length > 0)
          : [];
        const addonsUnitP = addons.reduce((sum, a) => sum + a.price, 0);
        const lineItemTotal = (unitP + addonsUnitP) * qty;

        computedTotalAmount += lineItemTotal;
        computedTotalQty += qty;

        return {
          itemTitle: it.itemTitle ? String(it.itemTitle).trim() : 'Artisan Treat',
          category: it.category ? String(it.category).trim() : '',
          selectedSize: it.selectedSize ? String(it.selectedSize).trim() : 'Standard',
          quantity: qty,
          unitPrice: unitP,
          selectedAddons: addons,
          addonsTotal: addonsUnitP * qty,
          itemTotal: lineItemTotal,
          itemImage: it.itemImage || '',
        };
      });
    }

    const parsedQty = hasItemsArray ? computedTotalQty : Math.max(1, parseInt(quantity, 10) || 1);
    const cleanedSelectedAddons = Array.isArray(selectedAddons)
      ? selectedAddons
          .map((a) => ({
            name: typeof a.name === 'string' ? a.name.trim() : '',
            price: Math.max(0, parseInt(String(a.price).replace(/[^0-9]/g, ''), 10) || 0),
          }))
          .filter((a) => a.name.length > 0)
      : [];

    const computedAddonsTotal = hasItemsArray
      ? cleanedItems.reduce((sum, it) => sum + (it.addonsTotal || 0), 0)
      : cleanedSelectedAddons.reduce((sum, a) => sum + a.price, 0) * parsedQty;

    const finalTotalAmount =
      Number(totalAmount) ||
      (hasItemsArray ? computedTotalAmount : parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0);

    const finalTitle = hasItemsArray
      ? cleanedItems.length === 1
        ? cleanedItems[0].itemTitle
        : `${cleanedItems[0].itemTitle} (+${cleanedItems.length - 1} more items)`
      : (itemTitle || '').trim();

    const finalSize = hasItemsArray
      ? cleanedItems.length === 1
        ? cleanedItems[0].selectedSize
        : 'Multiple Sizes'
      : (selectedSize || '');

    const finalCategory = hasItemsArray
      ? cleanedItems.length === 1
        ? cleanedItems[0].category
        : 'Assorted Treats'
      : (category || '');

    const finalImage = hasItemsArray
      ? cleanedItems[0]?.itemImage || itemImage || ''
      : (itemImage || '');

    const newOrder = await Order.create({
      orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryDate: deliveryDate || '',
      deliveryTime: deliveryTime || '',
      notes: notes ? notes.trim() : '',
      items: cleanedItems,
      itemTitle: finalTitle,
      category: finalCategory,
      selectedSize: finalSize,
      quantity: parsedQty,
      selectedAddons: hasItemsArray ? (cleanedItems[0]?.selectedAddons || []) : cleanedSelectedAddons,
      addonsTotal: computedAddonsTotal,
      totalAmount: finalTotalAmount,
      price: price || (finalTotalAmount ? `₹${finalTotalAmount}/-` : ''),
      itemImage: finalImage,
      status: 'pending',
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      paymentScreenshot: isCOD ? '' : (paymentScreenshot ? paymentScreenshot.trim() : ''),
      paymentScreenshotPublicId: isCOD ? '' : (paymentScreenshotPublicId || ''),
      transactionId: cleanTxId,
      paymentAmount: price || (finalTotalAmount ? `₹${finalTotalAmount}/-` : ''),
    });

    res.status(201).json({
      success: true,
      message: isCOD
        ? 'Order placed successfully with Cash on Delivery! Our studio will prepare your treats.'
        : 'Order placed successfully! Payment verification is pending studio review.',
      data: newOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to find order by _id or orderId safely
const findOrderSafely = async (param) => {
  if (!param) return null;
  const clean = String(param).trim();
  if (mongoose.isValidObjectId(clean)) {
    const byId = await Order.findById(clean);
    if (byId) return byId;
  }
  return await Order.findOne({ orderId: clean });
};

// GET /api/orders/:id - Dynamically fetch single order by orderId or _id from database
router.get('/:id', async (req, res) => {
  try {
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found in database.' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH update order status (Admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (status === 'cancelled') {
      if (order.cancellationStatus === 'pending') {
        order.cancellationStatus = 'approved';
      }
      order.cancellationResolvedAt = new Date();
    }
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

// PATCH /api/orders/:id/verify-payment (Admin verifies UPI payment)
router.patch('/:id/verify-payment', async (req, res) => {
  try {
    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.paymentStatus = 'verified';
    order.paymentVerifiedAt = new Date();
    order.paymentRejectedReason = '';
    // If order was pending, automatically confirm it upon payment approval
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
    await order.save();

    res.json({
      success: true,
      message: order.paymentMethod === 'Cash on Delivery'
        ? `Cash payment for Order #${order.orderId} marked as collected and confirmed!`
        : `Payment for Order #${order.orderId} verified and confirmed!`,
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/orders/:id/reject-payment (Admin rejects invalid/fake UPI payment)
router.patch('/:id/reject-payment', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required (e.g. UTR not found in bank statement, amount mismatch).',
      });
    }

    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.paymentStatus = 'rejected';
    order.paymentRejectedReason = reason.trim();
    await order.save();

    res.json({
      success: true,
      message: `Payment for Order #${order.orderId} marked as rejected. Customer will see the reason in the Tracker.`,
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/orders/:id/update-payment-proof (Customer re-uploads payment screenshot & UTR)
router.patch('/:id/update-payment-proof', async (req, res) => {
  try {
    const { paymentScreenshot, paymentScreenshotPublicId, transactionId } = req.body;

    if (!paymentScreenshot || !paymentScreenshot.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot image is required.',
      });
    }

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID / UTR number is required.',
      });
    }

    const cleanTxId = transactionId.trim().replace(/\s+/g, '').toUpperCase();
    if (cleanTxId.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Transaction / UTR ID (at least 8 characters).',
      });
    }

    const order = await findOrderSafely(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Check duplicate against OTHER orders
    const duplicateTx = await Order.findOne({
      _id: { $ne: order._id },
      transactionId: cleanTxId,
      status: { $ne: 'cancelled' },
    });
    if (duplicateTx) {
      return res.status(400).json({
        success: false,
        message: `This UPI Transaction ID (${cleanTxId}) is already associated with Order #${duplicateTx.orderId}.`,
      });
    }

    order.paymentScreenshot = paymentScreenshot.trim();
    if (paymentScreenshotPublicId) {
      order.paymentScreenshotPublicId = paymentScreenshotPublicId.trim();
    }
    order.transactionId = cleanTxId;
    order.paymentStatus = 'pending_verification';
    order.paymentRejectedReason = '';
    await order.save();

    res.json({
      success: true,
      message: 'Payment proof updated successfully! Pending bakery verification.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
