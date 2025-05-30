import { GoogleGenAI, Type } from "@google/genai";
import { google } from 'googleapis';
const youtube = google.youtube('v3');
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const customSearchEngineId = process.env.CUSTOM_SEARCH_ENGINE_ID
const customSearchApiKey = process.env.CUSTOM_SEARCH_API_KEY
const customsearch = google.customsearch('v1')

async function getYouTubeVideosForTitles(titles) {
  try {
    const videoRequests = titles.titles.map(async (title) => {
      const params = {
        part: 'snippet',
        q: title,
        type: 'video',
        maxResults: 2,
        key: youtubeApiKey,
      };
      const res = await youtube.search.list(params);
      return res.data.items?.slice(0, 2).map(video => ({
        title: video.snippet.title,
        type: 'video',
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      })) || [];
    });

    const videoResults = await Promise.all(videoRequests);
    return { videos: videoResults.flat() };
  } catch (err) {
    console.error("Error fetching YouTube videos:", err);
    return { error: "Failed to fetch YouTube videos" };
  }
}

async function performCustomSearch(query) {
    try {
      const response = await customsearch.cse.list({
        q: query, // The search query
        cx: customSearchEngineId, // Your Custom Search Engine ID
        key: customSearchApiKey, // Your Google API Key
        start: 1, // The index of the first result to return
        num: 2, // The number of search results to return
        gl: 'us',
        // Add any other relevant parameters for blog search
      });
  
      if (response.data.items) {
        return response.data;
      } else {
        console.log(`No results found for "${query}".`);
        return { items: [] }; // Return an empty items array if no results
      }
    } catch (error) {
      console.error('Error performing custom search:', error);
      throw error;
    }
}

async function getBlogArticlesForTitles(titles) {
  try {
    const searchRequests = titles.titles.map(async (title) => {
      const results = await performCustomSearch(title);
      return results.items?.map(item => ({
        title: item.title,
        type: "blog",
        url: item.link,
      })) || [];
    });

    const blogResults = await Promise.all(searchRequests);
    return { articles: blogResults.flat() };
  } catch (err) {
    console.error("Error fetching blog articles:", err);
    return { error: "Failed to fetch blog articles" };
  }
}

export async function makeExternalFunctionCall(arrayOfDays) {
  try {
    const youtubeFunctionDeclaration = {
      name: "get_youtube_videos_for_titles",
      description: "Gets youtube videos based on a list of titles passed. The videos are retrieved through the YouTube API.",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: {
              type: "string",
              description: "A YouTube video title or search query.",
            },
            description: "An array of YouTube video titles or search queries.",
          },
        },
        required: ["titles"],
      },
    };

    const blogFunctionDeclaration = {
      name: "get_blog_articles_for_titles",
      description: "Gets useful blog articles links based on a list of titles passed. The links are retrieved through the google custom search API.",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: {
              type: "string",
              description: "A blog article title or search query.",
            },
            description: "An array of blog article titles or search queries.",
          },
        },
        required: ["titles"],
      },
    };

    // Process all titles concurrently
    const result = await Promise.all(
      arrayOfDays.map(async (day) => {
        const title = day.title;

        const [videoResults, blogResults] = await Promise.all([
          getYouTubeVideosForTitles({ titles: [title] }),
          getBlogArticlesForTitles({ titles: [title] }),
        ]);

        const videos = videoResults.videos || [];
        const blogs = blogResults.articles || [];

        return {
          title,
          resources: [...videos, ...blogs],
        };
      })
    );

    return result;
  } catch (err) {
    console.log("Function Calling Error -----------------");
    console.log(err);
    return { error: err.message };
  }
}

