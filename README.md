# 🚀 iai-spark

**The deploy-everywhere, fully customizable AI agent user interface (UI) – designed by IXTY9 LLC and built by the [iXty9 Creative Community](https://ixty9.com/community)**

## What is iai-spark?

**iai-spark** is a feature-rich, enterprise-class web application for AI-powered agents and automation experiences. It provides a mobile-first design, highly customizable user interface (UI), and an admin dashboard for powering anything AI.

Designed for flexibility, speed, and brandability, iai-spark is the _"face"_ and _"control panel"_ for modern AI agents and automation workflows.

---

## Key Features

### Chat Interface
- **Beautiful, Responsive UI:** Modern React 18, TypeScript, Tailwind CSS, and shadcn/ui
- **Voice Input:** Real-time transcription with spoken punctuation conversion ("question mark" → "?")
- **File Attachments:** Image and document uploads with AI vision support, clipboard paste, and optimization
- **Session Management:** Persistent per-user chat memory for authenticated users, temporary sessions for anonymous users
- **Location Context:** Optional location data included in chat payloads for context-aware AI responses

### Admin Dashboard
- **User Management:** Full CRUD operations, role-based permissions, search, and pagination
- **Admin Profile Editing:** View and edit any user's profile with audit trail
- **Webhook Configuration:** Global and per-user custom webhook URLs with authentication headers
- **Theme Management:** Centralized theme settings with real-time preview
- **HighLevel Integration:** OAuth connection management, API proxy configuration, and installation overview
- **PWA Settings:** Service worker management, cache controls, and force refresh capabilities

### Authentication & Security
- **Multi-Context RLS:** Four-tier Row Level Security (application, anonymous, authenticated, admin)
- **Password Reset Flow:** Complete email-based password recovery
- **Role-Based Access:** Admin and user roles with secure edge function routing
- **Context-Aware Caching:** Services track authentication context to prevent cache poisoning

### Integrations
- **HighLevel (GHL):** OAuth integration with automatic token refresh, API proxy for n8n workflows
- **n8n Webhooks:** Configurable webhook endpoints with authentication headers
- **Per-User Webhooks:** Individual users can have dedicated n8n workflows

### Progressive Web App (PWA)
- **Installable:** Add to home screen on mobile and desktop
- **Offline Support:** Network-first caching with offline fallback
- **Auto Updates:** Build hash injection ensures users always get latest version
- **Push Notifications:** Browser notification support with notification center

### Customization
- **Theme System:** User-customizable colors for chat bubbles, name tags, and markup elements
- **Background Images:** Custom backgrounds with opacity and auto-dim controls
- **Sound Settings:** Configurable notification and message sounds
- **Branding:** White-label ready with configurable agent name, logo, and colors

---

## Architecture & Stack

### Frontend
- React 18.3, Vite, TypeScript
- React Router DOM (SPA with protected routes)
- Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
- TanStack React Query for data fetching
- Zustand for lightweight state management

### Backend
- Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- Edge Functions for secure server-side operations (admin-users, GHL proxy, webhooks)
- Storage for avatars and file uploads

### Key Services
- `coordinatedInitService` - App bootstrap and initialization
- `supaThemes` - Theme management singleton
- `settingsCacheService` - Context-aware settings caching
- `webhookService` - Webhook URL resolution and payload delivery

---

## Development

### Prerequisites
- Node.js 18+
- Supabase project (or Lovable Cloud)

### Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Supabase connection
4. Run development server: `npm run dev`

### Project Structure
```
src/
├── components/     # UI components organized by feature
├── contexts/       # React contexts (Auth, WebSocket, Theme, Location)
├── hooks/          # Custom React hooks
├── pages/          # Route components
├── services/       # Business logic and API services
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

supabase/
└── functions/      # Edge functions (admin-users, ghl-*, webhooks)
```

### Debug Panel
Access the debug panel in any environment via the "Dev Mode" toggle in the More Actions menu. Features include:
- Console log capture
- Performance metrics
- Browser and DOM information
- State debugging

---

## Deployment

- Developed using Lovable.dev as a collaborative build/deploy platform
- Hosted live at [ixty.ai](https://ixty.ai)
- Ready for custom domain configuration
- Automatic edge function deployment on code changes

---

## Get Involved

- **Built by the IXTY9 creative community.**  
  Want to collaborate, get support, or launch your own branded AI experience?  
  👉 [Join the IXTY9 Community](https://ixty9.com/community)

Let's create, automate, and launch what's next—together, with IXTY9!
