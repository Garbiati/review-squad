# Profile: TypeScript React (Frontend Web)

## Tech Stack
- **TypeScript** with strict mode
- **React** (check if legacy Class Components or Functional + Hooks)
- **Redux** or **Context API** for state management
- **React Router** for navigation
- **Axios** or **Fetch** for HTTP
- **Styled Components** / **CSS Modules** / **Tailwind** (check)
- **Jest** + **React Testing Library** for tests

## Architectural Patterns
- Component-based architecture
- Container/Presentational pattern (or hooks-based)
- Custom hooks for reusable logic
- Feature-based folder structure

## Review Checklist

### TypeScript
- [ ] No usage of `any` (use `unknown` when necessary)
- [ ] Well-defined interfaces/types for props and state
- [ ] Enums vs Union Types (prefer union types)
- [ ] Generics when it increases reusability
- [ ] No `@ts-ignore` or `@ts-nocheck`

### React Components
- [ ] Functional components with hooks (no class components in new code)
- [ ] Typed props with interface
- [ ] Proper memoization (useMemo, useCallback) - not excessive
- [ ] Unique keys in lists (don't use index as key)
- [ ] Cleanup in useEffect (unsubscribe, abort controllers)
- [ ] Components not too large (< 200 lines ideally)

### State Management
- [ ] Local vs global state (don't put everything in Redux)
- [ ] Selectors to derive data from store
- [ ] Descriptive and typed actions
- [ ] No direct state mutation

### Performance
- [ ] Lazy loading for heavy routes/components
- [ ] Avoid unnecessary re-renders
- [ ] Optimized images
- [ ] Bundle size awareness (don't import entire lodash)

### Accessibility
- [ ] Semantic HTML (not div for everything)
- [ ] aria-labels on interactive elements
- [ ] Keyboard navigation working
- [ ] Adequate contrast

### Frontend Security
- [ ] No dangerouslySetInnerHTML (or sanitized)
- [ ] Tokens not stored in localStorage (use httpOnly cookies)
- [ ] Input validation on frontend (in addition to backend)
- [ ] No secrets/API keys in frontend code
