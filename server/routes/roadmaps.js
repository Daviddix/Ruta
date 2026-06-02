import express from 'express';
import auth from '../middleware/auth.js';
import {
  createRoadmap,
  deleteRoadmap,
  editRoadmapWithAi,
  forkRoadmap,
  getPublicRoadmaps,
  getRoadmapById,
  getUserRoadmaps,
  updateRoadmap,
} from '../controllers/roadmapController.js';

const router = express.Router();

// @route   POST /api/roadmaps
// @desc    Save a generated roadmap
// @access  Private
router.post('/', auth, createRoadmap);

// @route   GET /api/roadmaps
// @desc    Get all saved roadmaps for logged-in user
// @access  Private
router.get('/', auth, getUserRoadmaps);

// @route   GET /api/roadmaps/public
// @desc    Get all public roadmaps
// @access  Public
router.get('/public', getPublicRoadmaps);

// @route   GET /api/roadmaps/:id
// @desc    Get roadmap by ID (Public for shareable links)
// @access  Public
router.get('/:id', getRoadmapById);

// @route   PUT /api/roadmaps/:id
// @desc    Update a roadmap
// @access  Private
router.put('/:id', auth, updateRoadmap);

// @route   DELETE /api/roadmaps/:id
// @desc    Delete a roadmap
// @access  Private
router.delete('/:id', auth, deleteRoadmap);

// @route   POST /api/roadmaps/:id/fork
// @desc    Fork/Clone a public roadmap
// @access  Private
router.post('/:id/fork', auth, forkRoadmap);

// @route   POST /api/roadmaps/:id/edit
// @desc    Refine/Edit an existing roadmap using Gemini
// @access  Private
router.post('/:id/edit', auth, editRoadmapWithAi);

export default router;
