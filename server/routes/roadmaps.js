import express from 'express';
import Roadmap from '../models/Roadmap.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { GoogleGenAI } from "@google/genai";
import { extractJSON } from "../lib/helper.js";

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

// @route   GET /api/roadmaps/public
// @desc    Get all public roadmaps
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ isPublic: true })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    const publicRoadmaps = roadmaps.map(roadmap => ({
      _id: roadmap._id,
      title: roadmap.title,
      goal: roadmap.goal,
      timeline: roadmap.timeline,
      createdAt: roadmap.createdAt,
      creator: roadmap.userId ? roadmap.userId.name : 'Ruta Architect'
    }));

    res.json(publicRoadmaps);
  } catch (err) {
    console.error('Get public roadmaps error:', err);
    res.status(500).json({ msg: 'Server error retrieving public roadmaps' });
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

// @route   POST /api/roadmaps/:id/fork
// @desc    Fork/Clone a public roadmap
// @access  Private
router.post('/:id/fork', auth, async (req, res) => {
  try {
    const parentRoadmap = await Roadmap.findById(req.params.id);
    if (!parentRoadmap) {
      return res.status(404).json({ msg: 'Roadmap to fork not found' });
    }

    // Create a copy under current user
    const forkedRoadmap = new Roadmap({
      userId: req.user.id,
      title: `${parentRoadmap.title} (Fork)`,
      goal: parentRoadmap.goal,
      timeline: parentRoadmap.timeline,
      isPublic: false, // Cloned copies are private by default
      forkedFrom: parentRoadmap._id
    });

    const savedFork = await forkedRoadmap.save();
    res.status(201).json(savedFork);
  } catch (err) {
    console.error('Fork roadmap error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Roadmap to fork not found' });
    }
    res.status(500).json({ msg: 'Server error during fork action' });
  }
});

// @route   POST /api/roadmaps/:id/edit
// @desc    Refine/Edit an existing roadmap using Gemini
// @access  Private
router.post('/:id/edit', auth, async (req, res) => {
  const { editInstruction } = req.body;
  if (!editInstruction) {
    return res.status(400).json({ msg: 'Please provide refinement instructions' });
  }

  try {
    const targetRoadmap = await Roadmap.findById(req.params.id);
    if (!targetRoadmap) {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // System Instruction for Editing
    const config = {
      responseMimeType: "application/json",
      systemInstruction: [
        {
          text: `You are Ruta, an intelligent roadmap architect. Your job is to modify/edit an existing learning roadmap based on a user's instructions.
          You will receive:
          1. The current roadmap JSON.
          2. The user's adjustment request (e.g. "Add a milestone on APIs", "Make it a 10-day course instead of 5").
          
          You must reconstruct the timeline JSON matching the exact same schema. Update descriptions, category, and emojis according to their specific instructions, while maintaining consistency across the rest of the learning journey. Ensure emojis match categories and use the exact color schemas for new nodes.
          Ensure that your output contains ONLY a syntactically correct JSON block matching the original structure. Avoid introductory or conversational text outside the JSON block.`,
        },
      ],
    };

    const model = "gemini-2.0-flash";

    // Combine current roadmap and user's instruction in prompt
    const promptText = `
    CURRENT ROADMAP:
    ${JSON.stringify({
      goal: targetRoadmap.goal,
      title: targetRoadmap.title,
      timeline: targetRoadmap.timeline
    }, null, 2)}
    
    USER ADJUSTMENT REQUEST:
    "${editInstruction}"
    `;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: promptText,
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    const parsedResponse = extractJSON(
      response.candidates[0].content.parts[0].text
    );

    // Save or clone based on ownership
    const isOwner = targetRoadmap.userId.toString() === req.user.id;
    let finalRoadmap;

    if (isOwner) {
      // Overwrite existing
      targetRoadmap.title = parsedResponse.title || targetRoadmap.title;
      targetRoadmap.timeline = parsedResponse.timeline;
      finalRoadmap = await targetRoadmap.save();
      console.log(`Successfully updated existing roadmap ${targetRoadmap._id} for owner ${req.user.id}`);
    } else {
      // Save as a new fork/cloned copy for the guest user
      const clonedRoadmap = new Roadmap({
        userId: req.user.id,
        title: parsedResponse.title || `${targetRoadmap.title} (Custom)`,
        goal: targetRoadmap.goal,
        timeline: parsedResponse.timeline,
        isPublic: false,
        forkedFrom: targetRoadmap._id
      });
      finalRoadmap = await clonedRoadmap.save();
      console.log(`Saved refined copy as new fork ${finalRoadmap._id} under user ${req.user.id}`);
    }

    res.json(finalRoadmap);
  } catch (err) {
    console.error('Refine roadmap error:', err);
    res.status(500).json({ msg: 'Server error refining roadmap' });
  }
});

export default router;
