const mongoose = require('mongoose');

const ROLES = [
  'Registration Desk',
  'Technical Support',
  'Hospitality',
  'Security',
  'Photography',
  'Stage Management',
];

const volunteerSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    role: { type: String, enum: ROLES, default: 'Registration Desk' },
    task: { type: String, default: '' },
    zone: { type: String, default: 'Main Entrance' },
    startTime: { type: Date },
    endTime: { type: Date },
    status: { type: String, enum: ['assigned', 'accepted', 'completed', 'reported'], default: 'assigned' },
    reportNote: { type: String, default: '' },
  },
  { timestamps: true }
);

volunteerSchema.index({ event: 1 });
volunteerSchema.index({ user: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);
module.exports.VOLUNTEER_ROLES = ROLES;
