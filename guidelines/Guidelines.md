# HeartConnect — Engineering & UX Guidelines

This document outlines the core architectural principles, tech stack standards, and engineering and UX rules governing the **HeartConnect** platform.

---

## 1. Core Technology Stack

### Frontend
- **Framework & Core**: React 18 (`^18.3.1`), TypeScript 5 (`~5.9.3`), Vite (`^8.0.0`).
- **TanStack Ecosystem**:
  - **TanStack Query (v5)**: Server-state synchronization, caching, optimistic mutations, and rollbacks.
  - **TanStack Table (v8)**: Reusable, server-side paginated tables with sorting and limit controls.
  - **TanStack Form**: Type-safe forms with real-time field-level schema validation.
- **Validation**: Zod runtime schema validation matching backend models.
- **Styling & UI**: Tailwind CSS (v4), shadcn/ui primitives (`@radix-ui`), Lucide icons.
- **Client UI State**: Zustand (`useUiStore`) for isolating transient UI states (modals, drawers, command palette).
- **3D & Physics**: Three.js, React Three Fiber (R3F), `@react-three/drei`, `@react-three/rapier`.
- **Real-Time Client**: Socket.io-client.
- **Feedback & Navigation**: Sonner toasts (with "Undo"/"Retry"), `cmdk` (global `Cmd+K` / `Ctrl+K` palette).

### Backend
- **Runtime & Framework**: Node.js (LTS), Express.js.
- **Database & ODM**: MongoDB Atlas, Mongoose (`^8.4.0`).
- **Authentication & Cryptography**: JSON Web Tokens (`jsonwebtoken`), Argon2 (`argon2`) with backward-compatible bcrypt verification.
- **Real-Time Engine**: Socket.io WebSockets.
- **Validation**: Zod runtime schemas.
- **Security Middleware**:
  - `helmet`: Secure HTTP headers (CSP, HSTS, cross-origin isolation).
  - `cors`: Strict origin allowlisting.
  - `express-rate-limit`: Tiered IP rate limiting.
  - `@exortek/express-mongo-sanitize` / custom in-place sanitizer: Strips MongoDB query injection operators (`$`, `.`).
  - `hpp`: HTTP parameter pollution protection.
  - `isomorphic-dompurify`: HTML/text input sanitization.
  - `multer` + `file-type`: Magic bytes memory buffer verification.
  - `csrf-csrf`: Double-submit cookie CSRF protection.
- **Observability & Health**: `@sentry/node` error reporting, `pino` / `pino-http` structured logging.
- **Dependency Health**: Weekly Dependabot updates, automated `npm audit` in CI.

---

## 2. Mandatory Engineering & UX Rules

### 1. Skeleton Loaders (shadcn/ui)
- Wireframe placeholders MUST match the layout, typography, and card dimensions of loaded data to eliminate Cumulative Layout Shift (CLS).
- Full-screen blank spinners are strictly prohibited.

### 2. Granular Suspense
- Wrap individual widgets and route segments in React `<Suspense>` boundaries.
- Allow fast widgets (e.g. statistics, announcements) to render immediately while heavier sections stream in.

### 3. Optimistic UI (TanStack Query)
- Apply immediate client-side UI updates upon user action (e.g., bookmarking a job, applying to a position, updating application status).
- Maintain snapshot context in `onMutate` and execute automatic rollback in `onError` if the network mutation fails.

### 4. State Boundary Separation
- **Server Data**: Managed exclusively via TanStack Query cache. Never mirror server data into component `useState` or Zustand without cause.
- **Client UI States**: Managed exclusively via Zustand (`src/stores/useUiStore.ts`). Includes modal open states, active drawers, confirmation targets, and transient layout toggles.

### 5. Server-Side Pagination (TanStack Table)
- All large datasets (Jobs, Applications, Logs) MUST be paginated on the backend via `page`/`offset`, `limit`, and `sort` parameters.
- Client-side pagination over full datasets is prohibited for unbounded queries.

### 6. URL State Synchronization
- Synchronize active search terms, skill filters, sort directions, and page numbers with URL search parameters (`?search=...&skill=...&page=...`).
- Ensure all filtered views are bookmarkable and shareable.

### 7. Inline Schema Validation (TanStack Form + Zod)
- Provide real-time, field-level error messages as users type or blur form inputs.
- Form validation schemas must directly mirror backend validation schemas.

### 8. Command Palette (cmdk / shadcn/ui)
- Maintain a global `Cmd+K` / `Ctrl+K` command modal accessible throughout the app.
- Provide quick navigation between views, search shortcuts, and role-based actions.

### 9. Contextual Empty States
- When queries or filters yield zero results, display layout-matched empty state components featuring a themed icon, descriptive copy, and a primary action button (e.g. "Reset Filters" or "Post a Job").

### 10. Action Feedback (Sonner Toasts)
- Use floating toast notifications via Sonner.
- Critical or state-reversing actions MUST include an interactive action (e.g., "Undo" for deletions/unsaving, "Retry" for failed mutations).

### 11. Destructive Confirmations (AlertDialog)
- Destructive operations (job deletion, applicant rejection, account deactivation) MUST require explicit confirmation via a modal `AlertDialog`.
- Danger buttons must use clear destructive visual cues.

### 12. Isolated Error Boundaries
- Contain component and route crashes with local fallback cards.
- Provide contextual diagnostic messages and a "Try Again" trigger without crashing parent views.

### 13. 3D Loop Decoupling (R3F)
- NEVER invoke `setState()` inside the React Three Fiber `useFrame()` loop.
- Update Three.js object positions, rotations, and scales directly via mutable `useRef` instances.

### 14. Simplified Physics (Rapier)
- Restrict dynamic rigid bodies in `@react-three/rapier` to primitive colliders: `cuboid`, `sphere`, and `capsule`.
- Avoid complex concave trimesh physics on animated bodies.

### 15. Asset Lifecycle Management
- Preload 3D assets using `useGLTF.preload()`.
- Explicitly dispose of unused geometries and materials on component unmount to prevent WebGL memory leaks.

### 16. Backend Sanitization
- Recursively strip MongoDB query injection operators (`$`, `.`) from request payloads without reassigning getter-only Express properties.
- Verify file uploads by inspecting magic bytes on memory buffers via `file-type` before persisting to disk.
