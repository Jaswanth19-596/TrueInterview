const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const auth = require('../middleware/auth');

// Get all interviews
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate('interviewer', 'name email')
      .populate('interviewee', 'name email');
    res.json(interviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new interview
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, date, time, interviewerId, intervieweeId } =
      req.body;

    const interview = new Interview({
      title,
      description,
      date,
      time,
      interviewer: interviewerId,
      interviewee: intervieweeId,
      status: 'scheduled',
    });

    await interview.save();
    res.status(201).json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interview by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('interviewer', 'name email')
      .populate('interviewee', 'name email');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update interview
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, date, time, status } = req.body;

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.title = title || interview.title;
    interview.description = description || interview.description;
    interview.date = date || interview.date;
    interview.time = time || interview.time;
    interview.status = status || interview.status;

    await interview.save();
    res.json(interview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete interview
router.delete('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    await interview.remove();
    res.json({ message: 'Interview deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
