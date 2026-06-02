# Ruta

Ruta is a web app that generates AI-guided learning roadmaps with timelines, resources, and a dashboard for managing your saved plans.

## Features
- AI roadmap generation with structured milestones
- Curated YouTube and blog resources per milestone
- Timeline and roadmap visual views
- User accounts with saved roadmaps and sharing
- Roadmap forking and public explore view
- Calendar scheduling and .ics export

## Requirements
- Node.js 18+
- MongoDB connection string
- API keys for Gemini, YouTube, and Google Custom Search

## Environment Variables
Create a `.env` file in `server/`:

```
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
CUSTOM_SEARCH_ENGINE_ID=your_custom_search_engine_id
CUSTOM_SEARCH_API_KEY=your_custom_search_api_key
CORS_ORIGIN=http://localhost:3000
```

## Run Locally
1) Install dependencies

```
npm install
```

2) Start the API server

```
cd server
npm install
npm run dev
```

3) Open the client

Serve the `public/` folder with any static server, or open `public/index.html` directly in a browser.

## Notes
- The API runs on `http://localhost:3000` by default.
- The client auto-selects the API base URL based on hostname.
- `JWT_SECRET` is required for auth and protected routes.