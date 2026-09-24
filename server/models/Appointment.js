const mongoose = require('mongoose');
const { Schema } = mongoose;

const appointmentSchema = new Schema({
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    patientId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slotId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    time: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    },
    firstName: {
        type: String,
        default: ''
    },
    lastName: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    nic: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    channelName: { 
        type: String, 
        default: ''
    }, 
    agoraToken: { 
        type: String,
        default: ''
    },
    orderId: {
        type: String,
        sparse: true,  // Allow null/undefined but ensure uniqueness for non-null values
        unique: true,
        index: true
    },
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;