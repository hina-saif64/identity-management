# User Intelligence Module

**Status:** ✅ Refactored & Modular  
**Label Prefix:** `AD-`  
**Lines of Code:** ~2000 (distributed across modules)

## 📁 Structure

```
ADUsers/
├── ADUsers.tsx                    # Main orchestrator
├── components/                    # UI Components
│   ├── DevLabel.tsx              # Development labeling
│   ├── PerformanceMetrics.tsx    # [AD-METRICS]
│   ├── UserTableHeader.tsx       # [AD-HEADER]
│   ├── UserTableRow.tsx          # [AD-ROW]
│   ├── EmptyState.tsx            # [AD-EMPTY]
│   ├── Filters/                  # Filter components
│   ├── BulkActions/              # Bulk action components
│   └── Modals/                   # Modal dialogs
├── hooks/                        # Custom hooks
├── utils/                        # Helper functions
├── types/                        # TypeScript types
└── constants/                    # Constants & configs
```

## 🏷️ Development Labels

All components have visual labels in development mode:
- `AD-FILTER-PANEL` - Main filter container
- `AD-BULK-BAR` - Bulk action bar
- `AD-MODAL-OU` - OU selector modal
- etc.

## 🔧 Usage

```typescript
import { ADUsers } from '@/components/ADUsers/ADUsers';

<ADUsers connection={connection} addLog={addLog} />
```

## 📝 Features

- ✅ Modular architecture (15+ focused components)
- ✅ Custom hooks for state management
- ✅ Input validation & sanitization
- ✅ Performance optimized (memoization, debouncing)
- ✅ Development labeling system
- ✅ TypeScript strict mode
- ✅ Security hardened

## 🔒 Security

- Input validation with Joi
- XSS protection with DOMPurify
- Rate limiting
- Sanitized outputs

## 📊 Performance

- Memoized expensive operations
- Debounced search (300ms)
- Lazy loaded modals
- Virtual scrolling ready

## 🧪 Testing

Each module can be tested independently.

## 📚 Documentation

See individual component files for detailed documentation.
