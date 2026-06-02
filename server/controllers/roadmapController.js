import Roadmap from '../models/Roadmap.js';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import { extractJSON } from '../lib/helper.js';

export const createRoadmap = async (req, res) => {
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
    return res.status(201).json(savedRoadmap);
  } catch (err) {
    console.error('Save roadmap error:', err);
    return res.status(500).json({ msg: 'Server error saving roadmap' });
  }
};

export const getUserRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(roadmaps);
  } catch (err) {
    console.error('Get user roadmaps error:', err);
    return res.status(500).json({ msg: 'Server error retrieving roadmaps' });
  }
};

export const getPublicRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ isPublic: true })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    const publicRoadmaps = roadmaps.map((roadmap) => ({
      _id: roadmap._id,
      title: roadmap.title,
      goal: roadmap.goal,
      timeline: roadmap.timeline,
      createdAt: roadmap.createdAt,
      creator: roadmap.userId ? roadmap.userId.name : 'Ruta Architect',
    }));

    return res.json(publicRoadmaps);
  } catch (err) {
    console.error('Get public roadmaps error:', err);
    return res.status(500).json({ msg: 'Server error retrieving public roadmaps' });
  }
};

export const getRoadmapById = async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.id || req.params.id);
    if (!roadmap) {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }
    const authHeader = req.header('Authorization');
    let requesterId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
          const decoded = jwt.verify(authHeader.split(' ')[1], jwtSecret);
          requesterId = decoded.id;
        }
      } catch (err) {
        requesterId = null;
      }
    }

    const isOwner = requesterId && roadmap.userId.toString() === requesterId;
    if (!roadmap.isPublic && !isOwner) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    return res.json(roadmap);
  } catch (err) {
    console.error('Get roadmap by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Roadmap not found' });
    }
    return res.status(500).json({ msg: 'Server error retrieving roadmap' });
  }
};

export const updateRoadmap = async (req, res) => {
  const { title, goal, timeline, isPublic } = req.body;

  try {
    const roadmap = await Roadmap.findById(req.params.id);

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
    return res.json(updatedRoadmap);
  } catch (err) {
    console.error('Update roadmap error:', err);
    return res.status(500).json({ msg: 'Server error updating roadmap' });
  }
};

export const deleteRoadmap = async (req, res) => {
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
    return res.json({ msg: 'Roadmap removed successfully' });
  } catch (err) {
    console.error('Delete roadmap error:', err);
    return res.status(500).json({ msg: 'Server error deleting roadmap' });
  }
};

export const forkRoadmap = async (req, res) => {
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
      isPublic: false,
      forkedFrom: parentRoadmap._id,
    });

    const savedFork = await forkedRoadmap.save();
    return res.status(201).json(savedFork);
  } catch (err) {
    console.error('Fork roadmap error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Roadmap to fork not found' });
    }
    return res.status(500).json({ msg: 'Server error during fork action' });
  }
};

export const editRoadmapWithAi = async (req, res) => {
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

    // System instruction for editing
    const config = {
      responseMimeType: 'application/json',
      systemInstruction: [
        {
          text: 'You are Ruta, an intelligent roadmap architect. Your job is to modify/edit an existing learning roadmap based on a user\'s instructions.\nYou will receive:\n1. The current roadmap JSON.\n2. The user\'s adjustment request (e.g. "Add a milestone on APIs", "Make it a 10-day course instead of 5").\n\nYou must reconstruct the timeline JSON matching the exact same schema. Update descriptions, category, and emojis according to their specific instructions, while maintaining consistency across the rest of the learning journey. Ensure emojis match categories and use the exact color schemas for new nodes.\nEnsure that your output contains ONLY a syntactically correct JSON block matching the original structure. Avoid introductory or conversational text outside the JSON block.',
        },
      ],
    };

    const model = 'gemini-2.0-flash';

    // Combine current roadmap and user's instruction in prompt
    const promptText = `
    CURRENT ROADMAP:
    ${JSON.stringify(
      {
        goal: targetRoadmap.goal,
        title: targetRoadmap.title,
        timeline: targetRoadmap.timeline,
      },
      null,
      2
    )}

    USER ADJUSTMENT REQUEST:
    "${editInstruction}"
    `;

    const contents = [
      {
        role: 'user',
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

    const parsedResponse = extractJSON(response.candidates[0].content.parts[0].text);

    // Save or clone based on ownership
    const isOwner = targetRoadmap.userId.toString() === req.user.id;
    let finalRoadmap;

    if (isOwner) {
      // Overwrite existing
      targetRoadmap.title = parsedResponse.title || targetRoadmap.title;
      targetRoadmap.timeline = parsedResponse.timeline;
      finalRoadmap = await targetRoadmap.save();
      console.log(
        `Successfully updated existing roadmap ${targetRoadmap._id} for owner ${req.user.id}`
      );
    } else {
      // Save as a new fork/cloned copy for the guest user
      const clonedRoadmap = new Roadmap({
        userId: req.user.id,
        title: parsedResponse.title || `${targetRoadmap.title} (Custom)`,
        goal: targetRoadmap.goal,
        timeline: parsedResponse.timeline,
        isPublic: false,
        forkedFrom: targetRoadmap._id,
      });
      finalRoadmap = await clonedRoadmap.save();
      console.log(
        `Saved refined copy as new fork ${finalRoadmap._id} under user ${req.user.id}`
      );
    }

    return res.json(finalRoadmap);
  } catch (err) {
    console.error('Refine roadmap error:', err);
    return res.status(500).json({ msg: 'Server error refining roadmap' });
  }
};
