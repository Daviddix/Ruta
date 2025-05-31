import { GoogleGenAI } from "@google/genai";
import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;
import dotenv from "dotenv";
import cors from "cors"; // Import the cors middleware
import { extractJSON, makeExternalFunctionCall } from "./lib/helper.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors()); // Enable CORS for all routes (or configure for specific origins)
app.use(express.json()); // Enable parsing of JSON request bodies (if needed)

app.post("/get-intro-text", async (req, res) => {
  const { userRequest } = req.body;
  try {
    const config = {
      responseMimeType: "application/json",
      systemInstruction: [
        {
          text: `You are Ruta, an intelligent roadmap architect. Your job is to generate 2 things: 1. A title
              2. A short and human like introductory text
              These things should be based on what the user wants to learn e.g if the user wants to learn UX Writing, the response should look something like this : {
              title : "Guide to Become an Amazing UX Writer",
              intro : "Hang tight! Building your personalized timeline and roadmap that will take you from zero to hero in UX Writing"
              }
              
              `,
        },
      ],
    };

    const model = "gemini-2.0-flash";

    const contents = [
      {
        role: "user",
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

    const parsedResponse = extractJSON(
      response.candidates[0].content.parts[0].text
    );

    res.status(200).json(parsedResponse);
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

app.post("/generate", async (req, res) => {
  const { userRequest, todaysDate, titleOfRoadmap } = req.body;
  try {
    const config = {
      responseMimeType: "application/json",
      systemInstruction: [
        {
          text: `You are Ruta, an intelligent roadmap architect. Your job is to generate clear, goal-oriented learning or project roadmaps for any topic the user wishes to pursue. Each roadmap should guide the user from beginner to advanced proficiency using a milestone-based timeline format. Each roadmap is broken into chronological days and contains as many milestones as needed to take someone from zero to hero in the skill they want to learn. Each milestone should feel like a thoughtful step in the journey. Prioritize progression in skill and clarity of purpose. Use time ranges (e.g., Day 02–04) when appropriate to group multi-day efforts. The tone should be clear, motivational, and structured. Avoid filler content. The roadmap should feel achievable, smart, and personalized. For each milestone, assign a category and match it with an appropriate emoji. Use this table of 15 examples as a guide for assigning emoji based on category.
          e.g :
          Learn : 📘
Research : 🔍
Practice : 🧪
Plan : 🧭
Rest : 🛌
Reflect : 🪞
Build : 🧱
Test : 🧪
Present : 🎤
Review : 🔁
Explore : 🗺️
Organize : 🗂️
Visualize : 🖼️
Refactor : 🛠️
Launch : 🚀

Contextual Emoji Adjustment Rules:
When context demands specificity, override the base emoji with a more relevant one:

"Practice drawing" → ✏️ (instead of 🧪)

"Research animals" → 🐘 or 🐾 (instead of 🔍)

"Practice coding" → 💻

"Explore typography" → 🔤

"Build a portfolio site" → 🌐

Avoid generic repetition — keep the roadmap visually engaging and emotionally resonant through relevant symbolism.
          
          Make sure the descriptions in each milestone feel like a knowledgeable teacher is giving thoughtful advice to a beginner. They should be insightful, connected to the goal, and flow naturally like a structured lesson plan.
          Don't just make it learning all through, also add other things that are important when someone is learning e.g resting , revising previous topics , practicing , checking progress, and others
  Note, today's date id ${todaysDate}
  
  Output a JSON structure with the following format:
  
  {
    "goal": "use this : ${titleOfRoadmap}",
    "timeline": [
      {
        "day": "Day 01",
        "date_range": "May 16th, 2025",
        "title": "Understanding the Basics of UX Writing",
        "description": "This section will take you from zero understanding...",
        "category": "Learn",
        "emoji" : "An emoji related to the category e.g if the category is research, the emoji should be a magnifying glass emoji(🔍)",
        "emojiDominantColor" : "A hexcode of the dominant color of the emoji in the emoji field",
        "emojiDominantDarkerColor" :"A hexcode of the emojiDominantColor but a darker version",
        //here are some examples for the colors : [
  {
    "category": "Research",
    "emoji": "🔍",
    "emojiDominantColor": "#5E5E5E",
    "emojiDominantDarkerColor": "#3E3E3E"
  },
  {
    "category": "Practice (drawing)",
    "emoji": "✏️",
    "emojiDominantColor": "#F4C542",
    "emojiDominantDarkerColor": "#C39F24"
  },
  {
    "category": "Research (animals)",
    "emoji": "🐘",
    "emojiDominantColor": "#9A9A9A",
    "emojiDominantDarkerColor": "#6B6B6B"
  },
  {
    "category": "Learn",
    "emoji": "📘",
    "emojiDominantColor": "#2B61D4",
    "emojiDominantDarkerColor": "#1C4091"
  },
  {
    "category": "Plan",
    "emoji": "🧭",
    "emojiDominantColor": "#D87C1D",
    "emojiDominantDarkerColor": "#A65F17"
  },
  {
    "category": "Reflect",
    "emoji": "🪞",
    "emojiDominantColor": "#8DA3B4",
    "emojiDominantDarkerColor": "#617381"
  },
  {
    "category": "Build",
    "emoji": "🧱",
    "emojiDominantColor": "#C1440E",
    "emojiDominantDarkerColor": "#912F07"
  },
  {
    "category": "Test (code)",
    "emoji": "🧪",
    "emojiDominantColor": "#7FB0D6",
    "emojiDominantDarkerColor": "#5583A1"
  },
  {
    "category": "Present",
    "emoji": "🎤",
    "emojiDominantColor": "#3D3D3D",
    "emojiDominantDarkerColor": "#2A2A2A"
  },
  {
    "category": "Review",
    "emoji": "🔁",
    "emojiDominantColor": "#4285F4",
    "emojiDominantDarkerColor": "#2F5EB6"
  },
  {
    "category": "Organize",
    "emoji": "🗂️",
    "emojiDominantColor": "#F4D03F",
    "emojiDominantDarkerColor": "#C1A72C"
  },
  {
    "category": "Visualize",
    "emoji": "🖼️",
    "emojiDominantColor": "#87B7E0",
    "emojiDominantDarkerColor": "#5D85A2"
  },
  {
    "category": "Launch",
    "emoji": "🚀",
    "emojiDominantColor": "#C13B2F",
    "emojiDominantDarkerColor": "#8F271F"
  }
]
        "shouldContainResources" : "a boolean that indicated if this day should contain resources or not e.g rest and relaxation shouldn't contain resources so it would be false",
      }
    ]
  } Make sure the JSON is fully parsable. Do not break JSON syntax or return text outside the JSON block.`,
        },
      ],
    };

    const model = "gemini-2.0-flash";

    const contents = [
      {
        role: "user",
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

    const parsedResponse = extractJSON(
      response.candidates[0].content.parts[0].text
    );

    //   const allTitles = parsedResponse.timeline.map((day)=>  {
    //     return {title : day.title}
    // })

    //   const allResources = await makeExternalFunctionCall(allTitles)

    //   parsedResponse.timeline.forEach((day => {
    //     if(!day.shouldContainResources){
    //       day.resources = []
    //       return
    //     }
    //     const foundResource = allResources.find((resource)=> resource.title == day.title)

    //     if(!foundResource){
    //       day.resources = []
    //       return
    //     }

    //     day.resources = foundResource.resources
    //   }))

    res.status(200).json(parsedResponse);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error"); // Send a proper error response
  }
});

app.get("/test", async (req, res) => {
  try {
    res.send("data received successfully");
  } catch (err) {
    res.send(err);
  }
});

app.listen(PORT, () => {
  console.log("I am alive");
});
