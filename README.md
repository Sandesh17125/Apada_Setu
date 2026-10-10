Apada Setu (आपदा सेतु) — The Disaster Bridge

Smart India Hackathon 2026 · Problem Statement SIH 26043 · Theme: Disaster Management · Category: Software · Team Kargil

Apada Setu is a web platform that turns disaster and community problem reports into funded, tracked, real-world solutions. A citizen reports a problem, AI classifies and prioritises it, the government validates it, it is matched to the best-fit university, and industry and NGOs fund it. The whole journey is tracked until the problem is resolved.

This is a working prototype built for the hackathon. Authentication is a simple browser-based demo, and some figures (such as funding estimates) are simulated.

How it works
Citizen reports → AI classification → Government validation → University matching
      → Project workspace → Industry / NGO funding → Resolution → Final report

Each challenge moves through six stages: Submitted → AI Classified → Govt. Validated → University Matched → In Progress → Resolved.

Features
Six role-based dashboards: Citizen, Government, University, Industry, NGO/CSR and Admin
Challenge reporting: state and district selection, a map to pin the exact location, severity level, and photo, video and document uploads
AI classification: category, priority and duplicate detection from the description, plus AI insights (summary, root cause, stakeholders, recommended expertise)
Smart university matching: ranked institutions with match scores, assigned by the government
Project workspace: a 7-stage tracker (Research → Final Implementation), with team and proposal details
Funding and financial tracking: required, received and gap amounts, with contributions from NGOs and industry
Audit trail: a timestamped record of every action taken on a challenge
Government analytics: charts, a challenge map and district-wise monitoring
Admin tools: challenge moderation, AI monitoring, institution and user views, and a printable final resolution report
Live notifications, an accessibility bar (text size and high contrast), and a landing page
Tech stack
Layer	Technologies
Frontend	React (Vite), Tailwind CSS v4, Recharts, React-Leaflet, Lucide icons
Backend	Node.js, Express 5, REST API
Database	MongoDB Atlas with Mongoose
Project structure
Apada_Setu/
├── apada-setu-frontend/    React app (Vite)
│   └── src/                App.jsx, api.js, auth.js, index.css, main.jsx
└── apada-setu-backend/     Express API
    ├── server.js           Routes: /api/health, /api/challenges
    └── models/Challenge.js MongoDB schema
Running it locally

You need Node.js installed. The backend and frontend run as two separate servers.

1. Backend
bash
cd apada-setu-backend
npm install

Create a file named .env inside apada-setu-backend with:

MONGO_URI=your-mongodb-atlas-connection-string
PORT=4000

Use the connection string from your own MongoDB Atlas cluster. Remember to allow your IP address in Atlas under Network Access. The .env file is ignored by Git, so your credentials are never uploaded.

Start the server:

bash
npm run dev

You should see MongoDB connected and Server running on http://localhost:4000.

2. Frontend

In a second terminal:

bash
cd apada-setu-frontend
npm install
npm run dev

Open http://localhost:5173 in your browser.

If the backend isn't running, the frontend still works. It falls back to built-in sample data, so you can try the full flow without setting up a database.

Trying the demo
Sign up as a Citizen and report a challenge.
Sign in as Government, approve it, and assign a university from the match list.
Sign in as University and accept the project, then advance its stages.
Sign in as NGO or Industry to offer funding or support.
Sign in as Admin to review everything and generate the final report once a project is resolved.
API endpoints
Method	Route	Purpose
GET	/api/health	Check that the server is running
GET	/api/challenges	List all challenges
POST	/api/challenges	Submit a new challenge
Known limitations
Accounts and sessions are stored in the browser's localStorage, so this is not secure authentication.
Role actions (approve, assign, accept, fund, delete) update the app's state in the browser. They are not yet saved to the database.
Uploaded files are counted but not stored.
The backend does not yet save every field the frontend collects (district, severity, impact and similar).
Team

Team Kargil · Smart India Hackathon 2026
