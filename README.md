# Brain.exe

An AI-assisted productivity application designed to decompose high-level objectives into clear, step-by-step actions.

## Live Website
[brainexe-web.vercel.app](https://brainexe-web.vercel.app)

## Core Features
- **AI Task Deconstruction**: Uses Google Gemini and NVIDIA LLaMA (via NVIDIA NIM) to break down vague goals into a sequential checklist of actionable tasks.
- **Habit Streaks**: Simple tracker to monitor consistency and daily routines.
- **Offline-First Sync**: Saves data locally to function without an active internet connection, with automatic synchronization to the database upon reconnection.

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (local storage caching, offline state synchronization)
- **Backend**: FastAPI (Python), SQLAlchemy ORM
- **Authentication**: JWT-based user authentication and bcrypt password hashing
- **Inference**: Google Gemini API, NVIDIA NIM (LLaMA)
