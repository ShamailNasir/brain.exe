# Brain.exe

Brain.exe is a minimalist, distraction-free productivity system designed to help users organize their objectives, build habits, and focus on immediate priorities. The system utilizes machine learning models to structure vague objectives into clear, step-by-step actions.

## Live Website
The application landing page is hosted at [brainexe-web.vercel.app](https://brainexe-web.vercel.app).

---

## Core Features

### AI-Driven Task Deconstruction
* **Multi-Model Inference**: Integrates Google Gemini and NVIDIA LLaMA (via NVIDIA NIM) to process user inputs.
* **Goal Deconstruction**: Takes a single, high-level task and automatically generates a logical, sequential checklist of sub-tasks to reduce starting friction.

### Habit & Consistency Tracking
* **Habit Streaks**: Built-in consistency metrics to monitor daily routines without intrusive alerts.
* **Quiet Productivity**: A design philosophy focused on letting users complete work without gamified distractions (such as badges, levels, or nagging notification systems).

### Offline-First Architecture & Synchronization
* **Local State Management**: The application remains fully functional offline, saving all user records to local storage.
* **Automatic Cloud Synchronization**: When an internet connection is restored, pending changes are synchronized back to the server.
* **Automated Fallback**: Robust error handling ensures local state integrity is preserved if backend servers are temporarily unreachable.

---

## Technical Stack & Architecture

### Frontend
* **Core**: HTML5, Vanilla CSS3 (custom variables, responsive layout support)
* **Logic**: Vanilla JavaScript managing local storage caching, network state monitoring, and custom template parsing.

### Backend & Database
* **API Engine**: FastAPI (Python) for async endpoint routing.
* **ORM & Database**: SQLAlchemy ORM for relational schema operations, connecting to an SQL database.
* **Security**: JSON Web Tokens (JWT) for authentication state, and bcrypt for password hashing.

### AI Integration
* **Gemini API**: Used for primary task analysis and structure mapping.
* **NVIDIA NIM (LLaMA)**: Used for fast, private secondary text generation and reasoning validation.
