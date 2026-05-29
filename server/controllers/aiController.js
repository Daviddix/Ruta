import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import { extractJSON, makeExternalFunctionCall } from '../lib/helper.js';
import {
  INTRO_TEXT_SYSTEM_INSTRUCTION,
  buildRoadmapSystemInstruction,
} from '../constants/aiPrompts.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getIntroText = async (req, res) => {
  const { userRequest } = req.body;
  try {
    const config = {
      responseMimeType: 'application/json',
      systemInstruction: [
        {
          text: INTRO_TEXT_SYSTEM_INSTRUCTION,
        },
      ],
    };

    const model = 'gemini-2.0-flash';

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: userRequest,
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

    return res.status(200).json(parsedResponse);
  } catch (err) {
    console.log(err);
    return res.status(500).send('Server Error');
  }
};

export const generateRoadmap = async (req, res) => {
  const { userRequest, todaysDate, titleOfRoadmap } = req.body;

  // Optional authentication for auto-saving
  const authHeader = req.header('Authorization');
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ruta_secret_key');
      userId = decoded.id;
    } catch (err) {
      console.log('Optional auth verification failed during /generate:', err.message);
    }
  }

  try {
    const config = {
      responseMimeType: 'application/json',
      systemInstruction: [
        {
          text: buildRoadmapSystemInstruction(todaysDate, titleOfRoadmap),
        },
      ],
    };

    const model = 'gemini-2.0-flash';

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: userRequest,
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

    const allTitles = parsedResponse.timeline.map((day) => {
      return { title: day.title };
    });

    const allResources = await makeExternalFunctionCall(allTitles);

    parsedResponse.timeline.forEach((day) => {
      if (!day.shouldContainResources) {
        day.resources = [];
        return;
      }
      const foundResource = allResources.find((resource) => resource.title == day.title);

      if (!foundResource) {
        day.resources = [];
        return;
      }

      day.resources = foundResource.resources;
    });

    // Auto-save roadmap if user is authenticated
    if (userId) {
      try {
        const Roadmap = (await import('../models/Roadmap.js')).default;
        const autoSavedRoadmap = new Roadmap({
          userId,
          title: parsedResponse.goal || titleOfRoadmap,
          goal: userRequest,
          timeline: parsedResponse.timeline,
        });
        const savedDoc = await autoSavedRoadmap.save();
        parsedResponse._id = savedDoc._id;
        console.log('Auto-saved newly generated roadmap for user:', userId);
      } catch (saveErr) {
        console.error('Error auto-saving roadmap:', saveErr);
      }
    }

    return res.status(200).json(parsedResponse);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
};

export const testEndpoint = async (req, res) => {
  try {
    return res.send('data received successfully');
  } catch (err) {
    return res.send(err);
  }
};
