const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create a new room (only for interviewers)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'interviewer') {
      return res
        .status(403)
        .json({ message: 'Only interviewers can create rooms' });
    }

    const roomId = uuidv4().substring(0, 6).toUpperCase(); // Generate a 6-character room ID
    const room = new Room({
      roomId,
      interviewer: req.user.userId,
    });

    await room.save();
    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a room (for interviewees)
router.post('/join/:roomId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'interviewee') {
      return res
        .status(403)
        .json({ message: 'Only interviewees can join rooms' });
    }

    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ message: 'Room is not available' });
    }

    room.interviewee = req.user.userId;
    room.status = 'in-progress';
    room.startedAt = new Date();
    await room.save();

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room details
router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('interviewer', 'name email')
      .populate('interviewee', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End interview session
router.post('/:roomId/end', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.interviewer.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: 'Only the interviewer can end the session' });
    }

    room.status = 'completed';
    room.endedAt = new Date();
    await room.save();

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active rooms for an interviewer
router.get('/interviewer/rooms', auth, async (req, res) => {
  try {
    if (req.user.role !== 'interviewer') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const rooms = await Room.find({
      interviewer: req.user.userId,
      status: { $ne: 'completed' },
    }).populate('interviewee', 'name email');

    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
