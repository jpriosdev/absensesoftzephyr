# Data Priorities Normalization Map

## CSV Original Values (Source)
From `data/MockDataV0.csv`:
- `Happy Path` - normal/standard execution priority
- `High` - high priority
- `Low` - low priority  
- `Normal` - normal/medium priority

## Normalized Values (Target)
All systems should use ONLY these three levels:

| CSV Input | Normalized | Label | UI Color | Category |
|-----------|-----------|-------|----------|----------|
| Happy Path | `High` | High Priority | Red (#dc2626) | Critical work |
| High | `High` | High Priority | Red (#dc2626) | Critical work |
| Normal | `Medium` | Medium Priority | Orange (#f59e0b) | Planned work |
| Low | `Low` | Low Priority | Gray (#6b7280) | Backlog work |

## Application Layers

### 1. CSV Loading (`scripts/loadCSVToDb.mjs`)
✅ **Status**: DONE
- Function: `normalizePriority(csvValue)`
- Applies mapping above before inserting into DB

### 2. Database Storage (`public/data/qa-dashboard.db`)
✅ **Status**: CLEANED
- Column: `bugs_detail.prioridad` (TEXT)
- Contains ONLY: `High`, `Medium`, `Low`
- No `Highest` or `Lowest` values

### 3. SQL Queries (`lib/database/dal.js`)  
✅ **Status**: UPDATED
- Critical (High): `WHERE prioridad IN ('High')`
- Medium: `WHERE prioridad IN ('Medium')`
- Low: `WHERE prioridad IN ('Low')`
- No references to `Highest` or `Lowest`

### 4. SQL Views (`lib/database/schema.sql`)
✅ **Status**: UPDATED
- All CASE WHEN statements updated
- Views: `vw_bugs_by_priority`, `vw_bugs_by_sprint`, etc.
- Expect ONLY: `High`, `Medium`, `Low`

### 5. JSON Export (`public/data/qa-data.json`)
✅ **Status**: REGENERATED
- `bugsByPriority`: Keys are `{High: {...}, Medium: {...}, Low: {...}}`
- `bugsByMonthByPriority`: Maps months to {critical, medium, lowPriority} counts

### 6. UI Presentation Layer
⏳ **Status**: IN PROGRESS - Need to update:
- `components/ExecutiveDashboard.js` - remove Highest/Lowest references
- `components/DetailModal.js` - remove Highest/Lowest references
- Maps local data access like `data.bugsByPriority['Highest']` → `data.bugsByPriority['High']`

## Critical Bug (=High Priority) Definition

Throughout system:
- **Critical Finding** = `prioridad = 'High'` (single value, no longer "Highest + High")
- Corresponds to "most urgent" work that needs immediate attention
- Shown in red (#dc2626) in UI

## Backward Compatibility
- Old references to `Highest`, `Lowest` are REMOVED
- Code expecting these values will fail (intentional to force updates)
- All UI code must explicitly map to: `High`, `Medium`, `Low`

## Validation Checklist
- [ ] DB contains ONLY High/Medium/Low in prioridad column
- [ ] All SQL queries updated
- [ ] All SQL views created correctly
- [ ] JSON generated with normalized priorities
- [ ] ExecutiveDashboard.js updated for new priority scheme
- [ ] DetailModal.js updated for new priority scheme
- [ ] Browser dashboard displays correctly
- [ ] No console errors for missing priority keys
