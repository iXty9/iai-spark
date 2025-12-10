
# Application Architecture Documentation

## Overview
This application is a full-stack React-based chat interface with Supabase backend, comprehensive admin panel, mobile-responsive design, advanced theme management, HighLevel CRM integration, and Progressive Web App (PWA) capabilities. The architecture emphasizes maintainability, performance, security, and multi-context authentication handling.

## Core Architecture Principles

### 1. Service-Oriented Architecture
- **Singleton Services**: Core services follow singleton patterns (`settingsService`, `supaThemes`, `settingsCacheService`, etc.)
- **Coordinated Initialization**: Centralized bootstrap system via `coordinatedInitService`
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data layers
- **Context-Aware Caching**: Services track authentication context to prevent cache poisoning across user sessions

### 2. Mobile-First Responsive Design
- **Progressive Enhancement**: Desktop features built on top of mobile foundation
- **Adaptive Components**: Components that transform based on screen size (cards ↔ tables)
- **Touch-Optimized**: All interactions designed for touch interfaces first
- **Custom Breakpoints**: Tailwind extended with `xs` (475px) breakpoint

### 3. Theme System Architecture
- **SupaThemes Integration**: Centralized theme management with database persistence
- **Design System Tokens**: HSL-based semantic color system in `index.css` and `tailwind.config.ts`
- **Preview Mode**: Non-destructive theme testing with rollback capabilities
- **Two-Layer System**: Fixed design elements (auth, cards) vs user-customizable elements (chat bubbles, colors)

### 4. Backend Integration (Supabase)
- **Authentication**: User management with role-based access control (admin/user roles)
- **Real-time Sync**: WebSocket connections for live data updates
- **Edge Functions**: Server-side logic for webhooks, AI processing, admin operations, and HighLevel API proxy
- **Storage**: File upload handling with optimized image processing (avatars, sounds buckets)

### 5. Four-Tier RLS Context Model
The application serves four distinct user contexts simultaneously:
1. **Application Level**: PUBLIC data for bootstrap (site_title, default_theme_settings)
2. **Anonymous Users**: No authentication, access to anonymous-specific features
3. **Authenticated Non-Admin Users**: Logged in users with standard permissions
4. **Admin Users**: Full system access and configuration capabilities

RLS policies use explicit key allowlists for each context rather than shared policies.

## Key Components & Services

### Core Services Layer
- **Settings Service** (`src/services/admin/settingsService.ts`): Centralized configuration management
- **Settings Cache Service** (`src/services/settings-cache-service.ts`): Context-aware settings caching
- **SupaThemes Service** (`src/services/supa-themes/`): Theme persistence and real-time sync
- **Coordinated Init Service** (`src/services/initialization/coordinated-init-service.ts`): Bootstrap orchestration
- **WebSocket Service** (`src/services/websocket/`): Real-time communication management
- **Location Service** (`src/services/location/location-service.ts`): GPS tracking with periodic profile updates

### Webhook System
- **Webhook Service** (`src/services/webhook/webhook-service.ts`): Core webhook delivery
- **URL Provider** (`src/services/webhook/url-provider.ts`): Webhook URL resolution
- **User Webhook Resolver** (`src/services/webhook/user-webhook-resolver.ts`): Per-user custom webhook support
- **Auth Header Builder** (`src/services/webhook/auth-header-builder.ts`): Authentication header management
- **GHL Installation Resolver** (`src/services/webhook/ghl-installation-resolver.ts`): HighLevel context injection

### Admin Panel Architecture
- **AdminTabs** (`src/components/admin/AdminTabs.tsx`): Responsive tab navigation (horizontal scroll on desktop, dropdown on mobile)
- **Individual Settings Components**: Modular admin sections:
  - `AppSettings.tsx` - Application configuration
  - `SeoSettings.tsx` - SEO metadata
  - `ThemeSettings.tsx` - Global theme configuration
  - `PWASettings.tsx` - PWA management with force refresh
  - `WebhookSettings.tsx` - Global webhook configuration
  - `AuthenticationSettings.tsx` - Auth provider settings
  - `WebSocketSettings.tsx` - WebSocket configuration
  - `UserManagement.tsx` - User list with role management
  - `HighLevelSettings.tsx` - GHL integration management
  - `Environment.tsx` - System diagnostics
- **User Management**: Role-based access control with mobile-optimized interfaces, admin profile editing

### Authentication & Authorization
- **AuthContext** (`src/contexts/AuthContext.tsx`): Global authentication state
- **ProtectedRoute**: Route-level access control
- **Role-Based System**: Admin/user hierarchies with database-backed permissions via `user_roles` table
- **Password Reset Flow**: ForgotPasswordForm → email → ResetPasswordForm with ?mode=reset URL handling

### Chat System Components
- **Message State Management** (`src/hooks/chat/use-message-state.ts`): Persistent chat history
- **WebSocket Integration**: Real-time message delivery and typing indicators
- **Voice Input Support**: Real-time interim transcription, punctuation conversion, continuous recording
- **File Attachments**: Image optimization, clipboard paste support, document handling
- **Session ID Management**: Per-user (authenticated) and per-session (anonymous) chat memory isolation

### HighLevel Integration
- **OAuth Flow**: Link GHL to existing Ixty account pattern
- **GHL API Proxy** (`supabase/functions/ghl-api-proxy/`): Middleware for n8n workflows
- **Token Management**: Encrypted storage with lazy + proactive refresh
- **Install Webhook**: Handles marketplace installations with pending → connected flow
- **Chat Payload Enhancement**: GHL context (location_id, company_id) injected for authenticated users

### PWA System
- **Network-First Caching**: Fresh content served when online, cached fallback offline
- **Build Hash Injection**: Automatic service worker updates via `{{BUILD_TIMESTAMP}}` replacement
- **Version Service** (`src/services/pwa/versionService.ts`): Version tracking and force refresh
- **Install Prompt**: Conditional PWA installation prompts

### Theme & UI System
- **SupaTheme Integration** (`src/hooks/use-supa-themes.ts`): Database-persisted theme management
- **Design System**: HSL-based semantic tokens in `index.css` and `tailwind.config.ts`
- **Responsive Components**: Mobile-first adaptive layouts (UserCard ↔ UsersTable)
- **Card Dark Mode Pattern**: Explicit `bg-background/80` class required alongside `glass-panel`

## Security Patterns

### Edge Function Security
- **Input Validation**: All edge functions validate input using Zod schemas
- **Admin API Routing**: All admin operations routed through secure edge functions, not client-side
- **Shared Secret Headers**: GHL proxy uses `X-Ixty-Proxy-Secret` for n8n authentication
- **Defensive Parameter Override**: Location-based fields always overridden server-side, never trust caller

### RLS Policy Design
- Explicit key allowlists per context (application, anonymous, authenticated, admin)
- `has_role()` and `is_admin()` security definer functions
- `is_safe_app_setting()` function for filtering sensitive keys
- Audit triggers for sensitive profile changes

### Webhook Security
- URL validation trigger prevents localhost/internal IPs
- Per-webhook authentication toggle flags
- Header name/value encryption for stored tokens

## Performance Considerations

### Bundle Size Optimizations
- Tree-shaking for debug code
- Lazy loading of non-critical components
- Optimized dependency imports

### Runtime Performance
- Memoized callbacks and computed values
- Event handler optimization
- Efficient cleanup patterns
- Context-aware caching prevents redundant fetches

### Memory Management
- Automatic cleanup of debug event history
- Weak references where appropriate
- Interval management for background tasks
- Service worker cache management

## Development Guidelines

### Architecture Preservation (CRITICAL)
1. **Follow Established Patterns**: Always analyze existing code patterns before creating new files
2. **Extend, Don't Replace**: Build on existing infrastructure rather than creating parallel systems
3. **Service Singletons**: Follow singleton patterns for core services
4. **Component Hierarchies**: Maintain clear component organization and naming conventions
5. **Context-Aware Services**: Thread authentication context through all cache-dependent operations

### Adding New Features
1. **Admin Panel**: Follow `AdminTabs` → Individual Components → `Admin.tsx` pattern
2. **Services**: Use existing service patterns and coordinate with `coordinatedInitService`
3. **Mobile-First**: Design for mobile, enhance for desktop
4. **Theme Integration**: Use HSL semantic tokens, never direct colors
5. **Webhooks**: Implement via webhook service layer with proper URL resolution

### App.tsx Modification Rules (CRITICAL)
1. **Never modify initialization flow**: `coordinatedInitService` handles all bootstrap logic
2. **Minimal provider additions**: Only add providers for essential core functionality
3. **Follow working patterns**: Reference existing successful components
4. **Provider Order**: QueryClientProvider → Router → AuthProvider → WebSocketProvider → SupaThemeProvider → LocationProvider

### Theme System Guidelines
1. **Use SupaThemes**: Never create parallel theme systems
2. **HSL Semantic Tokens**: Use design system tokens from `index.css` and `tailwind.config.ts`
3. **Preview Mode**: Support non-destructive theme testing
4. **Database Persistence**: All theme changes must sync with Supabase
5. **Fixed vs Customizable**: Auth/card components use native Tailwind; chat elements use SupaThemes

### Mobile-Responsive Design
1. **Card ↔ Table Transforms**: Components adapt layout based on screen size
2. **Progressive Disclosure**: Use collapsible sections and touch-optimized controls
3. **Tailwind Breakpoints**: `xs` (475px), `sm` (640px), `md` (768px), etc.
4. **Touch-First Interactions**: Design for touch, enhance for mouse/keyboard

### RLS Policy Guidelines
1. **Four-Context Testing**: Test all changes across application, anonymous, authenticated, and admin contexts
2. **Explicit Allowlists**: Use key allowlists rather than function-based filters
3. **Context Tracking**: Services must track lastCacheContext and invalidate on auth state changes
4. **Rollback on Failure**: If any context breaks, revert immediately

## File & Naming Conventions

- **Components**: PascalCase (`UserCard.tsx`)
- **Hooks**: kebab-case (`use-chat.ts`)
- **Services**: Domain folders under `src/services/` with camelCase files (`settingsService.ts`)
- **Edge Functions**: kebab-case folders (`ghl-api-proxy/`)
- **Imports**: Always use `@/` path alias

## Known Working References

- App initialization: `App.tsx` with `coordinatedInitService`
- Theme: `use-supa-themes.ts`, `SupaThemeContext.tsx`, `services/supa-themes/`
- Admin UI: All settings components in `src/components/admin/`
- Data operations: `services/admin/settingsService.ts`, `services/admin/userService.ts`
- Responsive tables: `UserCard.tsx`, `UsersTable.tsx`
- Webhook authentication: `services/webhook/auth-header-builder.ts`
- GHL integration: `services/webhook/ghl-installation-resolver.ts`, edge functions in `supabase/functions/ghl-*/`

## Known Limitations

### Current Constraints
- Debug panel available in all environments via Dev Mode toggle (More Actions menu)
- Local storage size limits for chat history
- Browser compatibility for advanced features (Web Speech API)
- GHL native n8n nodes not usable due to per-user scaling limitations

### Design Decisions
- Self-hosted Supabase (not Lovable Cloud) - external project connection
- HighLevel as middleware, not primary auth provider
- Client-side user search (up to 500 users) with documented server-side upgrade path
- Streaming skipped for now due to n8n implementation limitations

## Maintenance Notes

### Regular Tasks
- Monitor bundle size changes
- Review test coverage reports
- Update dependency versions
- Performance benchmark comparisons
- Rotate GHL proxy secret periodically

### Code Health Indicators
- Test coverage above 70%
- Bundle size under defined limits
- No memory leaks in debug tools
- Clean console in production builds
- All four RLS contexts functional
