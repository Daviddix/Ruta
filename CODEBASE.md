# Codebase Guide

## Architecture Overview
- Client: Static pages in /public with vanilla JS for auth, roadmap generation, dashboard, and rendering.
- API: Express server in /server exposing auth and roadmap endpoints plus AI generation endpoints.
- Data: MongoDB via Mongoose with User and Roadmap models.
- AI: Google GenAI (Gemini) generates roadmap content and intro text; resources are fetched via YouTube API and Google Custom Search.

## Key Directories and Files
- public/
  - index.html: Landing + app workspace UI shell.
  - script.js: Main client logic (chat, rendering, roadmap generation, export, schedule).
  - dashboard.html, dashboard.js: User dashboard and roadmap management.
  - auth.js, login.html, signup.html: Auth flows and token storage.
- server/
  - index.js: Express app setup, middleware, routes, startup checks.
  - routes/
    - auth.js: Login/signup/me routes.
    - roadmaps.js: CRUD, fork, edit routes.
  - controllers/
    - authController.js: JWT auth and user lifecycle.
    - roadmapController.js: Roadmap CRUD, public list, fork, AI edit.
    - aiController.js: Intro text and roadmap generation.
  - lib/
    - db.js: MongoDB connection with fallback to local.
    - helper.js: AI helpers and external resource retrieval.
  - models/
    - User.js: User schema with password and optional Google ID.
    - Roadmap.js: Roadmap schema with timeline and resources.

## Data Flow (High Level)
1) Client submits prompt (public/script.js) to /get-intro-text and /generate.
2) Server AI controller generates intro and roadmap JSON.
3) Server helper pulls YouTube and blog resources and merges into timeline.
4) If authenticated, server auto-saves roadmap.
5) Client renders timeline/roadmap views and exposes export/scheduling tools.

## Gotchas and Security Notes
- JWT_SECRET must be configured; server fails startup otherwise.
- /api/roadmaps/:id enforces isPublic or owner; do not remove the access check.
- CORS origins are restricted by CORS_ORIGIN; update when deploying.

## Suggested Reading Order
1) server/index.js to understand server setup and routing.
2) server/routes/auth.js and server/controllers/authController.js for auth flow.
3) server/routes/roadmaps.js and server/controllers/roadmapController.js for roadmap lifecycle.
4) server/controllers/aiController.js and server/lib/helper.js for AI generation and resource fetching.
5) server/models/User.js and server/models/Roadmap.js for data shape.
6) public/index.html to see the UI shell.
7) public/script.js for client state flow and rendering.
8) public/dashboard.js for saved roadmap management and sharing.

## Quick Environment Checklist
- MONGODB_URI
- JWT_SECRET
- GEMINI_API_KEY
- YOUTUBE_API_KEY
- CUSTOM_SEARCH_ENGINE_ID
- CUSTOM_SEARCH_API_KEY
- Optional: CORS_ORIGIN (comma-separated)
