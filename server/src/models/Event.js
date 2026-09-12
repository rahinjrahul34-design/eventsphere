const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0, default: 0 },
    quantity: { type: Number, min: 0, default: 0 }, // 0 = unlimited
    soldCount: { type: Number, default: 0 },
  },
  { _id: true }
);

const customFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'file'],
      default: 'text',
    },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
  },
  { _id: true }
);

const faqSchema = new mongoose.Schema({
  q: { type: String, required: true },
  a: { type: String, required: true },
});

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Event title is required'], trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, default: '', maxlength: 220 },
    description: { type: String, default: '' },
    metaTitle: { type: String, default: '', maxlength: 100 },
    metaDescription: { type: String, default: '', maxlength: 300 },
    primaryKeyword: { type: String, default: '', trim: true },
    coverImage: {
      type: String,
      default:
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=70',
    },
    images: { type: [String], default: [] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    categorySlug: { type: String, default: '' },
    tags: { type: [String], default: [] },
    eventType: { type: String, enum: ['offline', 'online', 'hybrid'], default: 'offline' },

    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },
    timezone: { type: String, default: 'Asia/Kolkata' },
    registrationDeadline: { type: Date },

    venue: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      onlineUrl: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: undefined }, // [lng, lat]
      },
    },

    capacity: { type: Number, required: [true, 'Capacity is required'], min: 1, default: 100 },
    registrationCount: { type: Number, default: 0 },
    activeHoldsCount: { type: Number, default: 0, min: 0 },
    checkedInCount: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    price: { type: Number, min: 0, default: 0 },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    customRegistrationFields: { type: [customFieldSchema], default: [] },
    faq: { type: [faqSchema], default: [] },

    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coOrganizers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },

    status: {
      type: String,
      enum: ['draft', 'published', 'live', 'completed', 'cancelled'],
      default: 'draft',
    },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvalNote: { type: String, default: '' },
    visibility: { type: String, enum: ['public', 'unlisted', 'private'], default: 'public' },
    featured: { type: Boolean, default: false },

    settings: {
      allowWaitlist: { type: Boolean, default: true },
      showAttendeeList: { type: Boolean, default: true },
      requireRegistrationApproval: { type: Boolean, default: false },
      certificatesIssued: { type: Boolean, default: false },
      smartQueue: {
        enabled: { type: Boolean, default: true },
        autoPromote: { type: Boolean, default: true },
        holdDurationMinutes: { type: Number, default: 15, min: 5, max: 60 },
        sendReminders: { type: Boolean, default: true },
        ticketTypeSpecific: { type: Boolean, default: true },
        priorityStrategy: { type: String, enum: ['fifo', 'ticket_tier'], default: 'fifo' },
      },
    },

    riskFlags: { type: [String], default: [] },
    popularityScore: { type: Number, default: 0 },

    safetyConfig: {
      emergencyContact: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        role: { type: String, default: '' },
      },
      firstAidStation: {
        location: { type: String, default: '' },
        details: { type: String, default: '' },
      },
      entryGates: { type: Number, default: 2, min: 1 },
      checkInDesks: { type: Number, default: 2, min: 1 },
      staffCount: { type: Number, default: 0, min: 0 },
      parkingCapacity: { type: Number, default: 0, min: 0 },
      parkingInfo: { type: String, default: '' },
      accessibilityInfo: {
        hasRampAccess: { type: Boolean, default: false },
        hasWheelchairSeating: { type: Boolean, default: false },
        accessibilityContact: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
      evacuationInstructions: { type: String, default: '' },
      evacuationPlanUrl: { type: String, default: '' },
      isOutdoor: { type: Boolean, default: false },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

eventSchema.index({ title: 'text', shortDescription: 'text', description: 'text', tags: 'text' });
eventSchema.index({ status: 1, approvalStatus: 1, startDate: -1 });
eventSchema.index({ categorySlug: 1 });
eventSchema.index({ 'venue.coordinates.coordinates': '2dsphere' });
eventSchema.index({ organizer: 1 });

eventSchema.virtual('isFull').get(function isFull() {
  const effective = (this.registrationCount || 0) + (this.activeHoldsCount || 0);
  return effective >= this.capacity;
});
eventSchema.virtual('seatsLeft').get(function seatsLeft() {
  const effective = (this.registrationCount || 0) + (this.activeHoldsCount || 0);
  return Math.max(0, this.capacity - effective);
});
eventSchema.virtual('isFree').get(function isFree() {
  const minPaid = (this.ticketTypes || []).reduce(
    (m, t) => (t.price > 0 ? Math.min(m, t.price) : m),
    this.price
  );
  return this.price === 0 && minPaid === 0;
});

module.exports = mongoose.model('Event', eventSchema);
