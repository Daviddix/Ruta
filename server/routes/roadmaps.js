import express from 'express';
import Roadmap from '../models/Roadmap.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/roadmaps
// @desc    Save a generated roadmap
// @access  Private
router.post('/', auth, async (req, res) => {
  const { title, goal, timeline, isPublic, forkedFrom } = req.body;

  if (!title || !goal || !timeline) {
    return res.status(400).json({ msg: 'Please provide title, goal, and timeline' });
  }

  try {
    const newRoadmap = new Roadmap({
      userId: req.user.id,
      title,
      goal,
      timeline,
      isPublic: isPublic || false,
      forkedFrom: forkedFrom || null,
    });

    const savedRoadmap = await newRoadmap.save();
    res.status(201).json(savedRoadmap);
  } catch (err) {
    console.error('Save roadmap error:', err);
    res.status(500).json({ msg: 'Server error saving roadmap' });
  }
});

// @route   GET /api/roadmaps
// @desc    Get all saved roadmaps for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(roadmaps);
  } catch (err) {
    console.error('Get user roadmaps error:', err);
    res.status(500).json({ msg: 'Server error retrieving roadmaps' });
  }
});

// @route   GET /api/roadmaps/:id
// @desc    Get roadmap by ID (Public for shareable links)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.id || req.params.id);
    if (!roadmap) {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }
    res.json(roadmap);
  } catch (err) {
    console.error('Get roadmap by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }
    res.status(500).json({ msg: 'Server error retrieving roadmap' });
  }
});

// @route   PUT /api/roadmaps/:id
// @desc    Update a roadmap
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { title, goal, timeline, isPublic } = req.body;

  try {
    let roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }

    // Make sure user owns the roadmap
    if (roadmap.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update fields
    if (title) roadmap.title = title;
    if (goal) roadmap.goal = goal;
    if (timeline) roadmap.timeline = timeline;
    if (typeof isPublic !== 'undefined') roadmap.isPublic = isPublic;

    const updatedRoadmap = await roadmap.save();
    res.json(updatedRoadmap);
  } catch (err) {
    console.error('Update roadmap error:', err);
    res.status(500).json({ msg: 'Server error updating roadmap' });
  }
});

// @route   DELETE /api/roadmaps/:id
// @desc    Delete a roadmap
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }

    // Make sure user owns the roadmap
    if (roadmap.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await roadmap.deleteOne();
    res.json({ msg: 'Roadmap removed successfully' });
  } catch (err) {
    console.error('Delete roadmap error:', err);
    res.status(500).json({ msg: 'Server error deleting roadmap' });
  }
});

export default router;
