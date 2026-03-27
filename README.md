# 💼 HeartConnect
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/jpmasangkay/heartconnect)

### Student Freelancer Job Marketplace

**Post. Apply. Connect. Now.**

A full-stack freelancer job marketplace built for students — featuring real-time chat, role-based dashboards, job postings, and application management, all wrapped in a modern, responsive interface.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://heartconnect-nine.vercel.app)

🔗 **Live Demo:** [heartconnect-nine.vercel.app](https://heartconnect-nine.vercel.app)

---

## ✨ Features

### 👤 Authentication & Roles

- **JWT-based authentication** — secure login, registration, and session handling
- **Role-based dashboards** — separate views and permissions for Clients and Freelancers
- Protected routes enforce access control across the entire application

### 📋 Job Postings

- Clients can **create, edit, and delete** job listings with full CRUD support
- Freelancers can **browse and filter** available jobs by category, budget, and status
- Each listing includes a detailed view with budget, description, tags, and deadline

### 📨 Application Management

- Freelancers can **apply to jobs** with a proposal message
- Clients can **review, accept, or reject** applications from their dashboard
- Application status updates are reflected in real time across both sides

### 💬 Real-Time Chat

- **Socket.io-powered messaging** — instant delivery with no page refresh required
- **In-chat file sharing** — attach and send files directly within conversations
- Conversation threads are scoped per job and per user pair

### 🔔 Push Notifications

- **Firebase Cloud Messaging (FCM)** integration for push notifications
- Users are alerted for new messages, application status changes, and job updates — even when the app is in the background

### 🛡️ Reliability & Security

- **Rate limiting** — prevents API abuse and spam submissions
- **Spam detection** — filters malicious or repetitive content in messages and listings
- **Response caching** — reduces redundant database calls for frequently accessed data
- **Zod runtime validation** — all API payloads validated and typed at the boundary

### ⚡ Performance & UX

- **TanStack React Query** — smart server state management with background refetching
- **React Error Boundaries** — graceful error handling per component tree
- **Skeleton loaders** — shimmer placeholders keep the UI responsive during data fetches
- Fully **responsive** — mobile-first layout that adapts to any screen size

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 19** | Component architecture with concurrent rendering |
| **TypeScript 5** | Full type safety across the entire codebase |
| **Vite** | Lightning-fast dev server and optimized production builds |
| **Tailwind CSS** | Utility-first styling with responsive, mobile-first design |
| **shadcn/ui** | Accessible UI primitives (buttons, inputs, dialogs, and more) |
| **TanStack React Query** | Server state management, caching, and background sync |
| **Zod** | Runtime API response validation and TypeScript type inference |
| **Socket.io Client** | Real-time bidirectional event-based communication |
| **Lucide React** | Crisp, consistent icon set |

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | REST API server and middleware layer |
| **MongoDB + Mongoose** | Document database and ODM for data modeling |
| **Socket.io** | Real-time WebSocket server for chat and notifications |
| **JSON Web Tokens** | Stateless authentication and route protection |
| **Firebase Admin SDK** | Server-side FCM push notification dispatch |
| **express-rate-limit** | API rate limiting and abuse prevention |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- A **MongoDB** connection string (Atlas or local)
- A **Firebase** project with FCM enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/jpmasangkay/heartconnect.git
cd heartconnect

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### Environment Variables

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

Create a `.env` file inside the `client/` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### Development

```bash
# Start the backend server
cd server
npm run dev

# In a separate terminal, start the frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

#### Client

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check with `tsc` and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |

#### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Express server with hot reload |
| `npm run build` | Compile TypeScript for production |
| `npm start` | Run the compiled production server |

---

## 📁 Project Structure

```
heartconnect/
├── client/                              # React frontend
│   ├── public/                          # Static assets
│   └── src/
│       ├── main.tsx                     # Entry point — React DOM + QueryClientProvider
│       ├── App.tsx                      # Root component — routes, auth context, boundaries
│       ├── index.css                    # Global styles & Tailwind directives
│       ├── types/
│       │   └── index.ts                 # Shared TypeScript types (User, Job, Application, etc.)
│       ├── lib/
│       │   └── utils.ts                 # cn() helper (clsx + tailwind-merge)
│       ├── schemas/                     # Zod validation schemas
│       │   ├── authSchema.ts            # Login / registration payload schemas
│       │   ├── jobSchema.ts             # Job listing create / edit schemas
│       │   └── applicationSchema.ts    # Application submission schemas
│       ├── api/                         # API fetch functions
│       │   ├── auth.ts                  # Auth endpoints (login, register, me)
│       │   ├── jobs.ts                  # Job CRUD endpoints
│       │   ├── applications.ts          # Application management endpoints
│       │   └── messages.ts             # Chat and file-share endpoints
│       ├── hooks/                       # Custom React Query hooks
│       │   ├── useAuth.ts
│       │   ├── useJobs.ts
│       │   ├── useApplications.ts
│       │   └── useMessages.ts
│       ├── context/
│       │   ├── AuthContext.tsx          # Global auth state and JWT handling
│       │   └── SocketContext.tsx        # Socket.io connection and event handling
│       ├── components/
│       │   ├── ui/                      # shadcn/ui primitives (button, input, dialog, …)
│       │   ├── layout/
│       │   │   ├── Navbar.tsx           # Top navigation with role-aware links
│       │   │   └── Sidebar.tsx          # Dashboard sidebar navigation
│       │   ├── jobs/
│       │   │   ├── JobCard.tsx          # Job listing card component
│       │   │   ├── JobForm.tsx          # Create / edit job form
│       │   │   └── JobFilters.tsx       # Filter bar for job browsing
│       │   ├── applications/
│       │   │   ├── ApplicationCard.tsx  # Application summary card
│       │   │   └── ProposalForm.tsx     # Freelancer proposal submission form
│       │   ├── chat/
│       │   │   ├── ChatWindow.tsx       # Real-time message thread view
│       │   │   ├── MessageBubble.tsx    # Individual message component
│       │   │   └── FileUpload.tsx       # In-chat file attachment handler
│       │   └── skeletons/              # Shimmer skeleton loaders
│       └── pages/
│           ├── LandingPage.tsx
│           ├── LoginPage.tsx
│           ├── RegisterPage.tsx
│           ├── JobsPage.tsx
│           ├── JobDetailPage.tsx
│           ├── ClientDashboard.tsx
│           ├── FreelancerDashboard.tsx
│           └── ChatPage.tsx
│
└── server/                              # Express backend
    └── src/
        ├── index.ts                     # Server entry point — Express + Socket.io init
        ├── config/
        │   ├── db.ts                    # MongoDB connection setup
        │   └── firebase.ts              # Firebase Admin SDK initialization
        ├── middleware/
        │   ├── auth.ts                  # JWT verification middleware
        │   ├── rateLimiter.ts           # express-rate-limit configuration
        │   └── spamDetection.ts         # Content spam filter middleware
        ├── models/
        │   ├── User.ts                  # User schema (role, profile, FCM token)
        │   ├── Job.ts                   # Job listing schema
        │   ├── Application.ts           # Application schema
        │   └── Message.ts              # Chat message schema
        ├── routes/
        │   ├── auth.ts                  # POST /register, /login, /me
        │   ├── jobs.ts                  # CRUD /jobs
        │   ├── applications.ts          # CRUD /applications
        │   └── messages.ts             # GET/POST /messages
        ├── controllers/                 # Route handler logic
        ├── socket/
        │   └── index.ts                 # Socket.io event handlers (chat, notifications)
        └── utils/
            ├── sendNotification.ts      # FCM push notification dispatcher
            └── cache.ts                 # In-memory response caching helpers
```

---

## 🧠 How It Works

HeartConnect is built around a **role-driven, real-time architecture** connecting student clients and freelancers:

1. **Authentication** — Users register as either a Client or Freelancer. JWTs are issued on login and attached to every subsequent API request. Protected routes on both the frontend and backend enforce role-based access.

2. **Job Marketplace** — Clients post jobs with a title, description, budget, and deadline. Freelancers browse the listings page with filter support. Each job detail page shows full info and an apply button for eligible freelancers.

3. **Application Flow** — Freelancers submit a proposal tied to a job. Clients see all incoming applications in their dashboard and can accept or reject them. Status changes are immediately reflected via React Query cache invalidation.

4. **Real-Time Chat** — Once connected, users communicate through Socket.io. Message events are emitted from the client, broadcast by the server, and received by the other party's active socket connection — no polling required. Files are uploaded via a dedicated endpoint and the download link is sent as a message payload.

5. **Push Notifications** — When a message arrives or an application status changes, the backend dispatches an FCM notification via Firebase Admin SDK to the recipient's registered device token — keeping users informed even when the tab is closed.

6. **Data Integrity** — Every form submission and API response is validated through a **Zod schema** before touching application state, ensuring type safety from the network boundary all the way through the UI.

---

## 🌐 Deployment

HeartConnect's frontend is deployed on **Vercel**. Pushing to `master` triggers an automatic build and deployment.

To deploy your own instance:
1. Import the `client/` folder into [Vercel](https://vercel.com) as the project root
2. Add all `VITE_*` environment variables in Vercel's **Environment Variables** settings
3. Deploy the `server/` to your preferred Node.js host (Railway, Render, etc.) and point `VITE_API_URL` to it

---

## 👥 Team

Built as a **CS 321 Software Engineering** final project at Sacred Heart College of Lucena City, Inc.

| Role | Responsibility |
|------|---------------|
| **Analyst** | Requirements gathering, documentation, use-case modeling |
| **UI/UX Designer** | Wireframes, design system, component prototyping |
| **Programmer** | Frontend and backend implementation |
| **DB / QA** | Database design, test planning, and quality assurance |

---

## 👏 Acknowledgements

- UI primitives by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Real-time engine by [Socket.io](https://socket.io/)
- Push notifications by [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- Database by [MongoDB Atlas](https://www.mongodb.com/atlas)

---
