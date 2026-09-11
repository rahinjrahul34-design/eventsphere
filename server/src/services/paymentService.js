const crypto = require('crypto');
const config = require('../config');
const { orderId, paymentId } = require('../utils/codes');

/**
 * Payment abstraction. With Razorpay credentials this wraps the real gateway;
 * otherwise it operates in DEMO mode where orders are instantly "captured"
 * (the demo checkout UI simulates the redirect/webhook round-trip).
 */

const isConfigured = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);

async function createOrder({ amount, currency = 'INR', receipt }) {
  if (!isConfigured()) {
    return {
      demo: true,
      provider: 'demo',
      orderId: orderId(),
      amount,
      currency,
      receipt,
      keyId: 'rzp_test_DEMO_MODE',
    };
  }
  // Real Razorpay integration point (kept behind abstraction):
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amount * 100, currency, receipt }),
  });
  const data = await resp.json();
  return { demo: false, provider: 'razorpay', orderId: data.id, amount, currency, receipt };
}

async function verifyPayment({ orderId: oid, paymentId: pid, signature }) {
  if (!isConfigured()) {
    return { demo: true, verified: true, paymentId: pid || paymentId(), capturedAt: new Date() };
  }
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${oid}|${pid}`)
    .digest('hex');
  return { demo: false, verified: expected === signature, paymentId: pid };
}

module.exports = { createOrder, verifyPayment, isConfigured };
