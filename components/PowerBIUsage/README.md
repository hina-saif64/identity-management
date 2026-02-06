# 📊 PowerBI Usage Module

## Overview
The PowerBI Usage module provides real-time PowerBI audit log analytics by connecting to Exchange Online unified audit logs. It displays user activity, operations, and usage statistics in a comprehensive dashboard.

## 🏗️ Architecture

### Folder Structure
```
PowerBIUsage/
├── 📄 PowerBIUsage.tsx          # Main orchestrator component (185 lines)
├── 📄 powerbi.types.ts          # TypeScript interfaces (47 lines)
├── 📄 README.md                 # This documentation
├── 📁 components/               # UI sub-components
│   ├── ExchangeConnect.tsx      # Exchange Online connection UI (79 lines)
│   ├── PowerBIHeader.tsx        # Module header component (51 lines)
│   ├── PowerBIControls.tsx      # Search and action controls (119 lines)
│   ├── PowerBIStats.tsx         # Statistics cards container (69 lines)
│   ├── PowerBIEmptyState.tsx    # Empty state displays (52 lines)
│   ├── PowerBIStatCard.tsx      # Individual statistics card (82 lines)
│   └── PowerBITable.tsx         # Data table with filtering (88 lines)
└── 📁 hooks/                    # Custom React hooks
    ├── usePowerBI.ts            # Main hook orchestrator (48 lines)
    ├── useExchangeConnection.ts # Exchange connection management (135 lines)
    ├── usePowerBIData.ts        # Data fetching and export (124 lines)
    └── usePowerBIFilters.ts     # Client-side filtering logic (65 lines)
```

**✅ All files comply with the 200-line development rule**

## 🔌 Integration

### Props Interface
```typescript
interface PowerBIUsageProps {
    connection: ConnectionState;           // AD connection state
    cloudConnection?: CloudConnectionState; // Cloud/Graph connection
    exchangeConnection?: ExchangeConnectionState; // Exchange Online connection
    addLog: (message: string, module: string, level?: string) => void; // Logging function
}
```

### Usage in Parent Component
```typescript
import PowerBIUsage from './components/PowerBIUsage/PowerBIUsage';

<PowerBIUsage 
    connection={adConnection}
    cloudConnection={cloudConnection}
    exchangeConnection={exchangeConnection}
    addLog={addLog}
/>
```

## 🔐 Authentication

**Uses Universal Authentication** - No individual authentication required.

### Authentication Flow:
1. Receives established connections from parent (App.tsx)
2. Uses existing Exchange Online session from Universal Auth
3. Leverages Cloud App credentials for API calls
4. No separate login process needed

### Required Permissions:
- **Exchange Administrator** role in Azure AD
- **Exchange.ManageAsApp** permission on Azure AD app
- Access to **unified audit logs**

## 🎯 Features

### Data Display
- **Real-time audit logs** from Exchange Online
- **User activity tracking** (up to 5000 records)
- **Operation summaries** with top activities
- **Date range filtering** (configurable days back)
- **Search and filtering** by user, operation, IP

### Statistics Cards
- **Unique Users** count
- **Total Activities** count  
- **Top Operations** breakdown
- **Date Range** display

### Export Functionality
- **CSV export** of filtered data
- **Date range** in filename
- **All visible columns** included

## 🔧 Technical Details

### Dependencies
- **React 18+** with hooks
- **TypeScript** for type safety
- **Lucide React** for icons
- **Tailwind CSS** for styling

### External Services
- **Exchange Online PowerShell** (via backend)
- **Azure Key Vault** (for credentials)
- **Hyperion Gateway API** (backend proxy)

### API Endpoints Used
- `GET /api/powerbi/status` - Check Exchange connection
- `POST /api/powerbi/connect` - Establish Exchange session
- `POST /api/powerbi/usage` - Fetch audit logs

## 🚀 Development

### Adding New Features
1. **UI Components** → Add to `components/` folder
2. **Business Logic** → Add to `hooks/` folder  
3. **Types** → Add to `powerbi.types.ts`
4. **Styling** → Use Tailwind classes

### Code Guidelines
- **Max 200 lines** per file
- **TypeScript** for all files
- **JSDoc comments** for functions
- **Descriptive naming** for variables/functions

### Testing
- Ensure Exchange Online module is installed
- Test with real Azure AD app credentials
- Verify audit log permissions

## 🐛 Troubleshooting

### Common Issues
1. **"Not connected to Exchange Online"**
   - Ensure Universal Auth is completed
   - Check Exchange Administrator role
   - Verify PowerShell module installation

2. **"No audit data found"**
   - Check date range (default 90 days)
   - Verify PowerBI activities exist
   - Ensure audit logging is enabled

3. **Authentication errors**
   - Verify Azure AD app permissions
   - Check Key Vault access
   - Confirm client secret validity

### Debug Mode
Enable debug logging in browser console:
```javascript
localStorage.setItem('powerbi-debug', 'true');
```

## 📚 Related Documentation
- [Hyperion Development Rules](../../HYPERION_DEVELOPMENT_RULES.md)
- [Universal Authentication](../UniversalAuth/README.md)
- [Microsoft PowerBI Audit Logs](https://docs.microsoft.com/en-us/powershell/exchange/connect-to-exchange-online-powershell)

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Maintainer:** Hyperion Development Team