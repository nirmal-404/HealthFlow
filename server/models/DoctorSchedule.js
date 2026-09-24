const mongoose = require('mongoose');
const { Schema } = mongoose;

const availabilitySchema = new Schema({
  day: {
    type: Date, // Change to Date to store the selected day
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  appointmentDuration: {
    type: Number,
    required: true
  }
});

const slotSchema = new Schema({
  day: {
    type: Date, // Change to Date to store the selected day
    required: true
  },
  slotTime: {
    type: Date,
    required: true
  },
  isBooked: {
    type: Boolean,
    required: true
  }
});

const scheduleSchema = new Schema({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  availability: [availabilitySchema],
  slots: [slotSchema],
  consultationFee: {
    type: Number,
    required: true
  }
});

const DoctorSchedule = mongoose.model('DoctorSchedule', scheduleSchema);

module.exports = DoctorSchedule;



