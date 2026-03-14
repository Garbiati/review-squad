# Profile: TypeScript React Native (Mobile)

## Tech Stack
- **TypeScript**
- **React Native**
- **Navigation** (React Navigation)
- **State Management** (Redux/Context)
- **Native Modules** when necessary

## Review Checklist

### React Native Specific
- [ ] Performance: avoid re-renders with FlatList (not ScrollView for lists)
- [ ] Use `StyleSheet.create` (no inline styles)
- [ ] Platform-specific code well isolated
- [ ] Images with proper resolution (@1x, @2x, @3x)
- [ ] Permissions declared correctly (AndroidManifest, Info.plist)

### Mobile UX
- [ ] Adequate touch targets (minimum 44x44 pts)
- [ ] Loading states and skeleton screens
- [ ] Offline handling
- [ ] Deep linking functional

### Mobile Performance
- [ ] Avoid unnecessary bridge calls
- [ ] Animations with `useNativeDriver: true`
- [ ] Memory leaks (listeners, subscriptions)
- [ ] Optimized bundle size

### Mobile Security
- [ ] Sensitive data in Keychain/Keystore (not AsyncStorage)
- [ ] Certificate pinning for APIs
- [ ] Code obfuscation enabled
- [ ] No sensitive logs in production
