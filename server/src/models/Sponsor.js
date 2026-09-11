const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // null = platform sponsors (admin)
    name: { type: String, required: true, trim: true },
    logo: {
      type: String,
      default: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=70',
    },
    tier: { type: String, enum: ['platinum', 'gold', 'silver', 'bronze'], default: 'bronze' },
    amount: { type: Number, default: 0 },
    benefits: { type: String, default: '' },
    website: { type: String, default: '' },
    contactName: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

sponsorSchema.index({ event: 1 });

module.exports = mongoose.model('Sponsor', sponsorSchema);
