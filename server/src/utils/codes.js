const { customAlphabet } = require('nanoid');

// Human-friendly codes (no ambiguous chars)
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nano = customAlphabet(alphabet, 8);

const ticketCode = () => {
  const s = nano();
  return `ES-${s.slice(0, 4)}-${s.slice(4)}`;
};

const certificateId = () => {
  const s = customAlphabet(alphabet, 10)();
  return `ES-CERT-${s.slice(0, 5)}-${s.slice(5)}`;
};

const orderId = () => `order_${customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 14)()}`;
const paymentId = () => `pay_demo_${customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 14)()}`;

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

module.exports = { ticketCode, certificateId, orderId, paymentId, slugify };
