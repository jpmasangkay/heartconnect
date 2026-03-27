# HeartConnect Backend

Backend API server for HeartConnect - a platform connecting students (freelancers) with clients who need work done.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT Bearer tokens (`Authorization` header); no session cookies
- **Validation**: Custom middleware with regex-based input validation
- **Security**: Helmet.js, rate limiting, password hashing
- **Real-time**: Socket.io
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js (v14+)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/heartconnect_users
JWT_SECRET=your-very-secure-random-secret-key-here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Important Database Name**: The database name must be `heartconnect_users` in your MongoDB URI.

### 3. Start the Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000` by default.

## Project Structure

```
backend/
├── src/
│   ├── index.js                 # Main server entry point with middleware
│   ├── models/                  # MongoDB Schemas
│   │   ├── User.js             # User model with lockout fields
│   │   ├── Job.js              # Job posting model
│   │   ├── Application.js       # Job application model
│   │   ├── Conversation.js      # Chat conversation model
│   │   └── Message.js          # Chat message model
│   ├── routes/                  # API endpoints
│   │   ├── auth.js             # Authentication (register, login, logout)
│   │   ├── jobs.js             # Job CRUD operations
│   │   ├── applications.js      # Job application management
│   │   ├── conversations.js     # Messaging system
│   │   └── users.js            # User profiles
│   └── middleware/              # Custom middleware
│       ├── validation.js        # Input validation & NoSQL injection prevention
│       ├── audit.js            # Security event logging
│       └── auth.js             # JWT verification
├── .env                         # Environment variables (git ignored)
├── .env.example                 # Example env template
├── package.json
└── README.md
```

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new student or client |
| POST | `/login` | No | Login with email & password |
| POST | `/logout` | No | Logout (client discards Bearer token) |
| GET | `/me` | Yes | Get current authenticated user |

**Login / register response**: JSON includes `token`; clients send `Authorization: Bearer <token>`.

### Jobs Routes (`/api/jobs`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Get all public jobs with filters |
| GET | `/:id` | No | Get single job details |
| GET | `/my` | Yes (client) | Get user's posted jobs |
| POST | `/` | Yes (client) | Create new job posting |
| PUT | `/:id` | Yes (client) | Update job (owner only) |
| DELETE | `/:id` | Yes (client) | Delete job (owner only) |
| POST | `/:id/close` | Yes (client) | Close job (stop accepting applications) |

**Filters**: `search`, `category`, `budgetMin`, `budgetMax`, `page`, `limit`

### Applications Routes (`/api/applications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes (client) | Get applications for user's jobs |
| GET | `/my` | Yes (student) | Get user's job applications |
| POST | `/` | Yes (student) | Apply to a job |
| PATCH | `/:id/status` | Yes (client) | Update app status (accept/reject) |
| PATCH | `/:id/withdraw` | Yes (student) | Withdraw application |

### Conversations Routes (`/api/conversations`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | Get all user conversations |
| POST | `/` | Yes | Create or get conversation with user |
| GET | `/:id/messages` | Yes | Get messages in conversation |
| POST | `/:id/messages` | Yes | Send message to conversation |
| PATCH | `/:id/read` | Yes | Mark conversation as read |
| DELETE | `/:id` | Yes | Delete conversation (participant only) |
| GET | `/unread` | Yes | Get unread message count |

### Users Routes (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id` | No | Get user profile (public info) |
| PUT | `/:id` | Yes (owner) | Update profile |
| PATCH | `/:id/skills` | Yes (student) | Add/update skills |
| PATCH | `/:id/rate` | Yes (student) | Update hourly rate |

## Security Features

### 1. Authentication & Authorization
- **JWT Authentication**: Bearer token in `Authorization` header (stateless)
- **Token Expiration**: 7 days (configurable)
- **Role-Based Access**: Different permissions for `student` and `client` roles
- **Permission Checks**: Every protected endpoint verifies user has access to resource

### 2. Password Security
- **Complexity Requirements**: 
  - Minimum 12 characters
  - Must include uppercase, lowercase, numbers, special characters
  - Regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/`
- **Hashing**: bcryptjs with 10 salt rounds
- **Account Lockout**: 5 failed login attempts = 30 minute lockout
- **Failed Attempts Tracking**: `failedAttempts` counter resets on successful login

### 3. Rate Limiting
- **Auth Endpoints**: 5 requests per 15 minutes per IP
- **General Endpoints**: 100 requests per 15 minutes per IP
- **Status**: Skips rate limit on successful requests
- **Implementation**: express-rate-limit with memory store

### 4. Input Validation
- **NoSQL Injection Prevention**: Regex escaping in search/filter queries
- **Field Validation**: Type checking, length limits on all inputs
- **Special Characters**: Sanitized where applicable
- **Middleware**: Centralized in `middleware/validation.js`

Validation includes:
- Job title/description length limits
- Message content validation
- Budget range validation
- Email format validation

### 5. Security Headers (Helmet.js)
- `Content-Security-Policy`: Restricts resources
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Strict-Transport-Security`: Forces HTTPS
- `X-XSS-Protection`: Browser XSS protection

### 6. Audit Logging
- **Security Events Logged**:
  - User login (success/failure)
  - Account lockout triggers
  - Failed login attempts
  - Password changes
  - Authorization failures
- **Log Data**: Timestamp, user ID, IP address, event type
- **Storage**: Audit logs stored in database for monitoring

### 7. CORS Configuration
- **Allowed Origins**: `CLIENT_URL` (comma-separated); in production each origin should use `https://`
- **Credentials**: Disabled (Bearer auth does not use cookies)
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

## Database Models

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String ('student' | 'client'),
  university: String (optional),
  skills: [String],
  hourlyRate: Number,
  bio: String,
  failedAttempts: Number (for lockout),
  lockedUntil: Date (account lockout timestamp),
  createdAt: Date,
  updatedAt: Date
}
```

### Job Model
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,
  budget: Number,
  budgetType: String ('fixed' | 'hourly'),
  deadline: Date,
  skills: [String],
  status: String ('open' | 'closed'),
  client: ObjectId (reference to User),
  applicationsCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Application Model
```javascript
{
  _id: ObjectId,
  job: ObjectId (reference to Job),
  student: ObjectId (reference to User),
  proposedRate: Number,
  message: String,
  status: String ('pending' | 'accepted' | 'rejected'),
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Model
```javascript
{
  _id: ObjectId,
  participants: [ObjectId] (references to Users),
  job: ObjectId (reference to Job),
  unreadCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  _id: ObjectId,
  conversation: ObjectId (reference to Conversation),
  sender: ObjectId (reference to User),
  content: String,
  read: Boolean,
  createdAt: Date
}
```

## Socket.io Real-Time Messaging

WebSocket connection for live messaging with JWT authentication.

### Client Events (Emit)
- `join_room` - Join conversation room
  - Payload: `{ conversationId: String }`
- `send_message` - Send message
  - Payload: `{ conversationId: String, content: String }`
- `typing` - Broadcast typing indicator
  - Payload: `{ conversationId: String, userId: String }`

### Server Events (Listen)
- `receive_message` - New message received (broadcast to room except sender)
  - Payload: Full Message object with sender details
- `typing` - Someone typing
  - Payload: `{ userId: String }`

### Connection
```javascript
const socket = io(SOCKET_URL, {
  auth: { token: jwtToken },
  transports: ['websocket'],
  reconnection: true,
});
```

## Common Issues & Solutions

### MongoDB Connection Error
**Problem**: `MongoError: connect ECONNREFUSED`
- Verify `MONGO_URI` in `.env`
- Check database name is `heartconnect_users`
- Ensure IP is whitelisted in MongoDB Atlas
- Verify username/password credentials

### JWT Token Expired
**Problem**: `Invalid or expired token`
- User needs to log in again
- Frontend automatically clears cookie
- Check `JWT_EXPIRE` setting in `.env`

### Account Locked
**Problem**: `Account temporarily locked`
- User is locked for 30 minutes after 5 failed logins
- IP address tracking for rate limiting
- Cannot log in until lockout period expires
- Logs show when this occurs

### Rate Limit Hit
**Problem**: `429 Too Many Requests`
- Wait 15 minutes for IP limit reset
- Check if legitimate traffic or potential attack
- Review audit logs for patterns

### Socket.io Connection Fails
**Problem**: WebSocket connection refused
- Verify `CLIENT_URL` matches CORS settings
- Check browser console for error details
- Ensure server is running and socket namespace is correct
- Try reconnection with exponential backoff

## Troubleshooting

### Check Server Health
```bash
curl http://localhost:5000/api/health
```

### View Recent Logs
- Check Node console output
- Review audit logs in MongoDB
- Enable debug mode for detailed logging

### Test Authentication
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPassword123!","role":"student"}'

# Login (response JSON contains "token")
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Get current user (replace TOKEN)
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer TOKEN"
```

## Deployment

### Production Checklist
1. ✅ Set strong `JWT_SECRET` (use random generator)
2. ✅ Use production MongoDB connection string
3. ✅ Set `NODE_ENV=production`
4. ✅ Terminate TLS at your reverse proxy; set `CLIENT_URL` to `https://...`
5. ✅ Use environment variable manager (not .env file)
6. ✅ Set up reverse proxy (nginx/Apache)
7. ✅ Enable HTTPS/SSL
8. ✅ Configure firewall rules
9. ✅ Set up monitoring and alerts
10. ✅ Regular backups of MongoDB

### Process Manager (PM2)
```bash
pm2 start src/index.js --name "heartconnect-api"
pm2 save
pm2 startup
```

## Contributing

- Follow existing code patterns
- Add validation for new endpoints
- Test with different user roles
- Update this README for new features
- Run security audit before committing

## License

Proprietary - HeartConnect Platform

