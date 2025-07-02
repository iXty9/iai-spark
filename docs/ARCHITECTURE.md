
# Application Architecture Documentation

## Overview
This application is a full-stack React-based chat interface with Supabase backend, comprehensive admin panel, mobile-responsive design, and advanced theme management. The architecture emphasizes maintainability, performance, and security.

## Core Architecture Principles

### 1. Service-Oriented Architecture
- **Singleton Services**: Core services follow singleton patterns (`settingsService`, `supaThemes`, etc.)
- **Coordinated Initialization**: Centralized bootstrap system via `coordinatedInitService`
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data layers

### 2. Mobile-First Responsive Design
- **Progressive Enhancement**: Desktop features built on top of mobile foundation
- **Adaptive Components**: Components that transform based on screen size (cards ↔ tables)
- **Touch-Optimized**: All interactions designed for touch interfaces first

### 3. Theme System Architecture
- **SupaThemes Integration**: Centralized theme management with database persistence
- **Design System Tokens**: HSL-based semantic color system in `index.css` and `tailwind.config.ts`
- **Preview Mode**: Non-destructive theme testing with rollback capabilities

### 4. Backend Integration (Supabase)
- **Authentication**: User management with role-based access control
- **Real-time Sync**: WebSocket connections for live data updates
- **Edge Functions**: Server-side logic for webhooks, AI processing, and admin operations
- **Storage**: File upload handling with optimized image processing

## Key Components & Services

### Core Services Layer
- **Settings Service** (`src/services/admin/settingsService.ts`): Centralized configuration management
- **SupaThemes Service** (`src/services/supa-themes/`): Theme persistence and real-time sync
- **Coordinated Init Service** (`src/services/initialization/coordinated-init-service.ts`): Bootstrap orchestration
- **WebSocket Service** (`src/services/websocket/`): Real-time communication management

### Admin Panel Architecture
- **AdminTabs** (`src/components/admin/AdminTabs.tsx`): Responsive tab navigation system
- **Individual Settings Components**: Modular admin sections (AppSettings, SeoSettings, ThemeSettings, etc.)
- **User Management**: Role-based access control with mobile-optimized interfaces
- **Environment Dashboard**: System diagnostics and configuration monitoring

### Authentication & Authorization
- **AuthContext** (`src/contexts/AuthContext.tsx`): Global authentication state
- **ProtectedRoute**: Route-level access control
- **Role-Based System**: Admin/moderator/user hierarchies with database-backed permissions

### Chat System Components
- **Message State Management** (`src/hooks/chat/use-message-state.ts`): Persistent chat history
- **WebSocket Integration**: Real-time message delivery and typing indicators
- **Voice Input Support**: Speech-to-text functionality
- **File Upload System**: Image and document handling with optimization

### Theme & UI System
- **SupaTheme Integration** (`src/hooks/use-supa-themes.ts`): Database-persisted theme management
- **Design System**: HSL-based semantic tokens in `index.css` and `tailwind.config.ts`
- **Responsive Components**: Mobile-first adaptive layouts (UserCard ↔ UsersTable)
- **Progressive Enhancement**: Touch-optimized interactions with desktop enhancements

## Performance Considerations

### Bundle Size Optimizations
- Tree-shaking for debug code
- Lazy loading of non-critical components
- Optimized dependency imports

### Runtime Performance
- Memoized callbacks and computed values
- Event handler optimization
- Efficient cleanup patterns

### Memory Management
- Automatic cleanup of debug event history
- Weak references where appropriate
- Interval management for background tasks

## Testing Strategy

### Unit Tests
- Individual hook behavior
- Utility function correctness
- Edge case handling

### Integration Tests
- Message flow end-to-end
- State synchronization
- Error boundary behavior

### Performance Tests
- Bundle size regression tests
- Runtime performance benchmarks
- Memory leak detection

## Development Guidelines

### Architecture Preservation (CRITICAL)
1. **Follow Established Patterns**: Always analyze existing code patterns before creating new files
2. **Extend, Don't Replace**: Build on existing infrastructure rather than creating parallel systems
3. **Service Singletons**: Follow singleton patterns for core services (`settingsService`, `supaThemes`)
4. **Component Hierarchies**: Maintain clear component organization and naming conventions

### Adding New Features
1. **Admin Panel**: Follow `AdminTabs` → Individual Components → `Admin.tsx` pattern
2. **Services**: Use existing service patterns and coordinate with `coordinatedInitService`
3. **Mobile-First**: Design for mobile, enhance for desktop
4. **Theme Integration**: Use HSL semantic tokens, never direct colors

### App.tsx Modification Rules (CRITICAL)
1. **Never modify initialization flow**: `coordinatedInitService` handles all bootstrap logic
2. **Minimal provider additions**: Only add providers for essential core functionality
3. **Follow working patterns**: Reference existing successful components

### Theme System Guidelines
1. **Use SupaThemes**: Never create parallel theme systems
2. **HSL Semantic Tokens**: Use design system tokens from `index.css` and `tailwind.config.ts`
3. **Preview Mode**: Support non-destructive theme testing
4. **Database Persistence**: All theme changes must sync with Supabase

### Mobile-Responsive Design
1. **Card ↔ Table Transforms**: Components adapt layout based on screen size
2. **Progressive Disclosure**: Use collapsible sections and touch-optimized controls
3. **Tailwind Breakpoints**: `xs` (475px), `sm` (640px), `md` (768px), etc.
4. **Touch-First Interactions**: Design for touch, enhance for mouse/keyboard

## Known Limitations

### Current Constraints
- Debug panel only available in development
- Local storage size limits for chat history
- Browser compatibility for advanced features

### Future Improvements
- Server-side state synchronization
- Advanced debug data export
- Performance profiling integration
- Automated test coverage reporting

## Maintenance Notes

### Regular Tasks
- Monitor bundle size changes
- Review test coverage reports
- Update dependency versions
- Performance benchmark comparisons

### Code Health Indicators
- Test coverage above 70%
- Bundle size under defined limits
- No memory leaks in debug tools
- Clean console in production builds
