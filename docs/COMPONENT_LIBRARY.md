# Hyperion V2 Component Library

## Overview
The Hyperion V2 Component Library provides a set of reusable, theme-aware components that follow our design system principles.

## Design Principles
- **Glass Morphism**: Subtle transparency with backdrop blur effects
- **Theme Consistency**: Full dark/light mode support
- **Accessibility**: WCAG 2.1 AA compliant
- **Performance**: Optimized for minimal re-renders
- **Modularity**: Each component is self-contained and reusable

## Components

### Button
A versatile button component with multiple variants and states.

```tsx
import { Button } from '../components/UI';

// Primary button
<Button variant="primary" size="md">
  Save Changes
</Button>

// With icon and loading state
<Button 
  variant="secondary" 
  icon={Save} 
  loading={isLoading}
  onClick={handleSave}
>
  Save
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `icon`: React component
- `theme`: 'light' | 'dark'

### Card
A container component with glass morphism effects.

```tsx
import { Card } from '../components/UI';

<Card theme="dark" hover glass>
  <div className="p-6">
    Card content here
  </div>
</Card>
```

**Props:**
- `theme`: 'light' | 'dark'
- `hover`: boolean - enables hover animations
- `glass`: boolean - enables glass morphism effect
- `className`: string - additional CSS classes

## Navigation Components

### NavigationCategories
Professional categorized navigation with dropdown menus.

```tsx
import NavigationCategories from '../components/Navigation/NavigationCategories';

<NavigationCategories
  activeTab={activeTab}
  onTabChange={setActiveTab}
  theme={theme}
/>
```

**Features:**
- Hover-based dropdown menus
- Active state management
- Responsive design
- Smooth animations

## Notification System

### NotificationSystem
Auto-dismissing toast notifications with multiple types.

```tsx
import NotificationSystem from '../components/Notifications/NotificationSystem';

// Component usage
<NotificationSystem theme={theme} />

// Programmatic usage
showNotification.success('Success!', 'Operation completed successfully');
showNotification.error('Error!', 'Something went wrong');
showNotification.warning('Warning!', 'Please check your input');
showNotification.info('Info', 'Here is some information');
```

**Features:**
- Auto-dismiss after 10-15 seconds
- Multiple notification types
- Queue management
- Smooth animations
- Progress indicators

## Dashboard Components

### EnhancedDashboard
Modern dashboard with metric cards and quick actions.

```tsx
import EnhancedDashboard from '../components/Dashboard/EnhancedDashboard';

<EnhancedDashboard
  addLog={addLog}
  theme={theme}
  userSummary={userSummary}
  lastFetched={lastFetched}
/>
```

**Features:**
- Animated metric cards
- Quick action buttons
- System status indicators
- Responsive grid layout

## Theme System

All components support both light and dark themes through the `theme` prop. The theme system uses:

- **Dark Theme**: Deep blues and grays with high contrast
- **Light Theme**: Clean whites and subtle grays
- **Glass Effects**: Backdrop blur with subtle transparency
- **Smooth Transitions**: 300ms duration for all theme changes

## Usage Guidelines

1. **Always pass the theme prop** to ensure consistent styling
2. **Use the glass effect sparingly** for key UI elements
3. **Prefer semantic variants** over custom styling
4. **Test in both themes** before deploying
5. **Follow accessibility guidelines** for color contrast

## Future Enhancements

- [ ] Form components (Input, Select, Checkbox)
- [ ] Data display components (Table, List)
- [ ] Feedback components (Alert, Progress)
- [ ] Layout components (Grid, Stack)
- [ ] Storybook integration
- [ ] Unit tests for all components