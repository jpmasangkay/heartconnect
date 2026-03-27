# HeartConnect Frontend

Frontend application for HeartConnect - a platform connecting students (freelancers) with clients who need work done.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Real-time**: Socket.io Client
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Form Handling**: React (built-in)

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Backend API running on `http://localhost:5000`

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

The environment variables:
- `VITE_API_URL`: Backend API endpoint (must match backend `CLIENT_URL`)
- `VITE_SOCKET_URL`: Socket.io server URL

### 3. Start Development Server

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Application will run on `http://localhost:5173` by default.

## Project Structure

```
frontend/src/
├── api/                          # API integration
│   ├── index.ts                 # Axios instance & all API endpoints
│   └── types.ts                 # TypeScript type definitions
├── components/                   # Reusable components
│   ├── Navbar.tsx               # Top navigation bar
│   ├── Footer.tsx               # Footer component
│   ├── ProtectedRoute.tsx        # Role-based route protection
│   ├── JobCard.tsx              # Job listing card
│   ├── ui/
│   │   ├── forms.tsx            # Form inputs (Input, Select, Badge)
│   │   └── index.ts             # Component exports
│   └── ...other components
├── context/                      # React Context for global state
│   └── AuthContext.tsx          # Authentication state & JWT cookie management
├── hooks/                        # Custom React hooks
│   └── useParallax.ts           # Scroll effect hooks
├── pages/                        # Route pages/screens
│   ├── Landing.tsx              # Public landing page
│   ├── Login.tsx                # User login
│   ├── Register.tsx             # User registration (student/client)
│   ├── Dashboard.tsx            # Student & Client dashboards
│   ├── JobBoard.tsx             # Browse jobs (students only)
│   ├── JobDetail.tsx            # Job details & application
│   ├── PostJob.tsx              # Create new job (clients)
│   ├── EditJob.tsx              # Edit existing job (clients)
│   ├── Profile.tsx              # User profile management
│   └── Chat.tsx                 # Messaging interface
├── types/                        # TypeScript type definitions
│   └── index.ts                 # All application types
├── App.tsx                      # Main app component with routing
├── main.tsx                     # Application entry point
└── index.css                    # Global styles

public/
├── favicon.svg                  # Site favicon
└── index.html                   # HTML template (pre-built by Vite)
```

## Key Features by Role

### For Students (Freelancers)
- **Browse Jobs**: Search and filter available job postings
  - By title, keywords, category
  - By budget range
  - Sorted by recency
- **Apply to Jobs**: Submit applications with proposed rate and message
- **Track Applications**: View status of all applications (pending/accepted/rejected)
- **Student Dashboard**: 
  - Application stats (total, pending, accepted, rejected)
  - Recent applications list
  - Quick access to apply more jobs
- **Messaging**: Chat with clients about accepted jobs
- **Profile**: 
  - Add skills and hourly rate
  - Update profile information
  - Manage university affiliation

### For Clients
- **Post Jobs**: Create job postings with title, description, budget, deadline, skills required
- **Manage Jobs**: View, edit, and close job postings
- **View Applications**: See applications from students
- **Accept/Reject Applications**: Manage applicant status
- **Client Dashboard**:
  - Job posting stats (total, open, closed, applicants)
  - Posted jobs list with application counts
  - Quick action to post new job
- **Messaging**: Chat with accepted applicants
- **Profile**: Update company info and preferences

## Authentication Flow

1. **Register**: User chooses role (student/client) and creates account
   - Email must be unique
   - Password requires: 12+ chars, uppercase, lowercase, number, special char
2. **Login**: Credentials validated
   - Success: JWT stored in HTTP-only cookie
   - Failure: Account locks after 5 attempts (30 min)
3. **Session**: Token persists across page refreshes
   - Frontend calls `/auth/me` on mount to restore session
   - JWT auto-included in all API requests via cookies
4. **Logout**: Cookie cleared on server and client

**Security Note**: JWT never exposed to JavaScript - stored only in HTTP-only cookies.

## API Integration

### Core API Methods

```typescript
// Authentication
authApi.register(data)        // Create new account
authApi.login(email, password) // Login user
authApi.logout()              // Logout user
authApi.getMe()               // Get current user from JWT

// Jobs
jobsApi.getAll(filters)       // Browse all jobs
jobsApi.getById(id)           // Get job details
jobsApi.getMyJobs()           // Get user's posted jobs (clients)
jobsApi.create(data)          // Create new job
jobsApi.update(id, data)      // Edit job
jobsApi.delete(id)            // Delete job
jobsApi.close(id)             // Close job from applications

// Applications
applicationsApi.apply(data)           // Apply to job
applicationsApi.getMyApplications()   // Get my applications
applicationsApi.updateStatus(id, status) // Accept/reject (client)
applicationsApi.withdraw(id)          // Withdraw application (student)

// Conversations
messagesApi.getConversations()           // Get all chats
messagesApi.getMessages(conversationId)  // Get messages in chat
messagesApi.sendMessage(conversationId, content) // Send message
messagesApi.deleteConversation(id)       // Delete entire conversation
messagesApi.markRead(conversationId)     // Mark chat as read

// Users
usersApi.getProfile(userId)   // Get user profile
usersApi.updateProfile(data)  // Update own profile
usersApi.updateSkills(skills) // Update skills (student)
usersApi.updateRate(rate)     // Update hourly rate (student)
```

### Error Handling

All API calls handle errors gracefully:
- 401: Unauthorized (redirect to login)
- 403: Forbidden (access denied)
- 404: Not found
- 422: Validation error (show user message)
- 500: Server error

## Real-Time Messaging (Socket.io)

Messages update instantly across all devices using WebSocket connection.

### Connection
```typescript
const socket = io(SOCKET_URL, {
  auth: { token: jwtToken },
  transports: ['websocket'],
  reconnection: true,
});
```

### Sending Messages
```typescript
socket.emit('send_message', {
  conversationId: activeConvId,
  content: messageText,
});
```

### Receiving Messages
```typescript
socket.on('receive_message', (message) => {
  // Add message to conversation
  setMessages(prev => [...prev, message]);
});

socket.on('typing', ({ userId }) => {
  // Show typing indicator
  setIsTyping(true);
  setTimeout(() => setIsTyping(false), 2000);
});
```

## Authentication Context

Global auth state managed with React Context:

```typescript
// In any component:
const { user, isAuthenticated, login, logout } = useAuth();

// user: { _id, name, email, role, ... } or null
// isAuthenticated: boolean
// login(email, password): Promise
// logout(): void
```

### Features:
- Auto-restore session from HTTP-only cookie on app load
- Handles token refresh automatically
- Role-based access control
- Logout clears client-side state and cookie

## Styling with Tailwind CSS

Global styles in `index.css`:

```css
.solid-card { /* Card container */ }
.solid-panel { /* Panel container */ }
.solid-surface { /* Surface background */ }
.page-transition { /* Fade transition between routes */ }
```

Color variables (via CSS custom properties):
- `--navy`: Primary dark blue
- `--navy-light`: Lighter navy
- `--cream`: Off-white background
- `--stone-muted`: Muted text color
- `--stone-border`: Border color

## Form Components

Reusable form controls in `components/ui/forms.tsx`:

```typescript
// Text input
<Input
  type="text"
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="custom-class"
/>

// Dropdown select
<Select value={selected} onChange={(e) => setSelected(e.target.value)}>
  <option value="">Select option</option>
  <option value="option1">Option 1</option>
</Select>

// Multi-line textarea
<Textarea
  placeholder="Enter description"
  value={text}
  onChange={(e) => setText(e.target.value)}
/>

// Status badge
<Badge variant="accepted">Accepted</Badge>
<Badge variant="pending">Pending</Badge>
<Badge variant="rejected">Rejected</Badge>
```

## Protected Routes

Role-based route protection with `ProtectedRoute` component:

```typescript
// For both authenticated roles
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// For specific role only (redirects if wrong role)
<ProtectedRoute requiredRole="student">
  <JobBoard />
</ProtectedRoute>

<ProtectedRoute requiredRole="client">
  <PostJob />
</ProtectedRoute>
```

## Navigation by Role

### Student Navigation
- Find Work → /jobs
- Dashboard → /dashboard
- Messages → /chat
- Profile → /profile

### Client Navigation
- Dashboard → /dashboard (shows posted jobs)
- Post Job → /jobs/post
- Messages → /chat
- Profile → /profile

**Note**: Students cannot access `/jobs/post`, clients cannot access `/jobs` (redirects to dashboard).

## Building for Production

### Build Steps
```bash
npm run build
```

This creates optimized production build in `dist/` folder with:
- Minified JavaScript & CSS
- Code splitting & lazy loading
- Asset optimization
- Source maps for debugging

### Environment for Production
Create `.env.production`:
```env
VITE_API_URL=https://api.heartconnect.com/api
VITE_SOCKET_URL=https://api.heartconnect.com
```

### Deployment
1. Run `npm run build`
2. Deploy `dist/` folder to web server (Netlify, Vercel, etc.)
3. Configure server to redirect all routes to `index.html` (SPA)
4. Set environment variables on hosting platform

### Performance Optimization
- Vite provides fast development and optimized builds
- React 18 automatic batching
- Tailwind CSS purges unused styles
- Socket.io binary protocol for efficient real-time updates

## Troubleshooting

### Connection Refused to API
**Problem**: `Error: Network Error - http://localhost:5000/api`
- Verify backend is running on port 5000
- Check `VITE_API_URL` in `.env`
- Ensure backend allows CORS from frontend origin
- Check browser DevTools Network tab

### Authentication Lost After Refresh
**Problem**: User logged out after page refresh
- Check if cookies are enabled
- Verify backend `/auth/me` endpoint works
- Check `VITE_API_URL` matches backend `CLIENT_URL`
- Clear browser cookies and re-login

### Socket.io Not Connecting
**Problem**: Messages not loading, typing indicators not showing
- Verify `VITE_SOCKET_URL` is correct
- Check WebSocket connection in browser DevTools
- Ensure backend is running and socket is configured
- Check for firewall/proxy blocking WebSocket

### Styling Issues
**Problem**: Tailwind classes not applying
- Clear node_modules: `rm -rf node_modules && npm install`
- Check `tailwind.config.js` content paths
- Rebuild: `npm run dev` or `npm run build`

### TypeScript Errors
**Problem**: Type errors in IDE
- Ensure `tsconfig.json` is properly configured
- Run `npm install` to get type definitions
- Check `types/index.ts` has all definitions
- Restart TypeScript server in IDE

## Development Tips

### Debugging
- Use React DevTools browser extension
- Check Redux DevTools for state
- Browser DevTools Network tab for API calls
- Console logs for debugging flow

### Hot Module Replacement (HMR)
- Vite automatically reloads on code changes
- State preserved during updates
- Fast feedback loop for development

### Testing Flow
1. Register new account
2. Login and verify session persists
3. For students: Browse jobs, apply to one
4. For clients: Post a job, view applications
5. Send messages between accounts
6. Test on mobile via `npm run dev` with network IP

## Code Style

- **TypeScript**: Use strict mode, define all types
- **Components**: Functional components with hooks
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Files**: One component per file
- **Comments**: Clarify complex logic only

## Contributing

- Follow existing patterns
- Add TypeScript types for all data
- Test with different screen sizes
- Update this README for new features
- Test with both user roles

## License

Proprietary - HeartConnect Platform
