const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  interviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed'],
    default: 'waiting',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
