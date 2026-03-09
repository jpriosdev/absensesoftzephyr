# QA Dashboard - Architecture & Development Guide

## 🏗️ System Architecture (Current - SQLite + CSV)

### Backend Data Layer

```
API Request (pages/api/qa-data.js)
    ↓
qaDataLoader.getQAData()
    ├─ Check in-memory cache (5 min TTL)
    ├─ Load from SQLite via DAL
    │   ├─ Data source: qa-dashboard.db
    │   ├─ Normalized schema with views
    │   └─ Real data from MockDataV0.csv
    ├─ On error: Load from JSON backup
    ├─ Final fallback: Minimal safe data
    └─ Cache result (5 min TTL)
    ↓
Cached & returned to client
```

**Key Benefits:**
- **Single Source of Truth**: SQLite database (`qa-dashboard.db`)
- **Performance**: 5-minute in-memory cache + normalized SQL views
- **Resilience**: Graceful degradation (JSON → fallback data)
- **Maintainability**: Centralized DAL for all database queries
- **Scalability**: Prepared for multi-dataset scenarios

### Frontend Components

```
ExecutiveDashboard (pages/qa-dashboard.js)
├─ KPICard (12 instances)
│   ├─ avgTestCasesPerSprint
│   ├─ resolutionEfficiency
│   ├─ defectDensity
│   ├─ criticalBugsRatio
│   ├─ cycleTime
│   ├─ bugLeakage
│   ├─ testAutomation
│   └─ ... (more metrics)
├─ SprintTrendChart
│   └─ Multi-axis trends with normalized field mapping
├─ DeveloperAnalysis
│   └─ Workload and resolution efficiency by developer
├─ ModuleAnalysis
│   └─ Bug distribution across system modules
├─ QualityMetrics
│   └─ Key quality indicators with SQL/CSV field normalization
├─ ActionableRecommendations
│   └─ Data-driven action items from metrics
└─ DetailModal
    └─ Drill-down analysis with recommendations
```

## 💾 Data Loading Architecture

### qaDataLoader.js (Main Loader)

Located: `lib/qaDataLoader.js`

**Exports:**
```javascript
export async function getQAData({ forceReload = false } = {})
```

**Load Strategy:**
1. Return cached data if available and < 5 minutes old
2. Primary: Load from SQLite via DAL (`lib/database/dal.js`)
3. Fallback: Load from JSON backup (`public/data/qa-data.json`)
4. Final: Return minimal safe data structure
5. Cache result for future requests (5 min TTL)

**Usage:**
```javascript
import { getQAData } from '../lib/qaDataLoader.js';

// In API route
const qaData = await getQAData();
res.json(qaData);

// Force cache refresh
const freshData = await getQAData({ forceReload: true });
```

### SQLite Data Access Layer (DAL)

Located: `lib/database/dal.js`

**Purpose:** Centralized database queries with normalized schemas

**Key Methods:**
- `getFullQAData()` - Complete dataset with all views
- `getBugsSummary()` - Overview metrics
- `getBugsBySprint()` - Sprint-level aggregates
- `getDeveloperModulesSummary()` - Developer workload by module
- `getQualityMetrics()` - Calculated KPIs
- `getRecommendations()` - Data-driven suggestions

**Database Structure:**
```
qa-dashboard.db
├─ Tables (normalized from MockDataV0.csv)
│  ├─ bugs_detail (individual incidences)
│  ├─ sprints_versions (sprint metadata)
│  ├─ developers (team members)
│  └─ modules (system components)
├─ Views (aggregated queries)
│  ├─ vw_bugs_summary
│  ├─ vw_bugs_by_sprint
│  ├─ vw_bugs_by_sprint_status
│  ├─ vw_developer_stats
│  └─ ... (15+ views total)
└─ Indexes (performance optimization)
```

### Data Source Hierarchy

1. **SQLite Database** (Primary - `qa-dashboard.db`)
   - Source: MockDataV0.csv (1000+ records)
   - Format: Normalized relational schema
   - Availability: ✅ Production-ready

2. **JSON Cache** (Backup - `public/data/qa-data.json`)
   - Generated from: `npm run generate-json`
   - Purpose: Failover if database unavailable
   - Freshness: Depends on CI/deployment pipeline

3. **Minimal Safe Data** (Emergency - Built-in)
   - Ensures app never crashes
   - Empty/zero values, metadata only
   - Warning flag: `_warning: 'Database not available'`

### Configuration

Located: `lib/config.js`

**Exports:**
```javascript
ROOT                    // Project root path
DATA_DIR               // data/ directory
JSON_PATH              // Non-public JSON path
PUBLIC_DATA_DIR        // public/data/ directory
PUBLIC_JSON_PATH       // Public JSON path
DB_PATH                // qa-dashboard.db path
QA_CONFIG              // qa-config.json settings
APP_SETTINGS           // app-settings.json settings
APP_CONFIG             // Merged configuration
```

**Paths:**
- Database: `public/data/qa-dashboard.db`
- Backup JSON: `public/data/qa-data.json`
- Config: `config/qa-config.json` + `config/app-settings.json`

## 🎨 Frontend Components

### ExecutiveDashboard.js (Main Container)

**Purpose:** Orchestrates all dashboard views and data flow

**Key Features:**
- Tab-based interface (overview, sprint comparison, etc.)
- Auto-refresh capability (configurable interval)
- Parametric mode support (data from API)
- Detail modal for drill-down analysis
- KPI reordering capability

**Data Flow:**
```javascript
props.data (or fetch from /api/qa-data)
    ↓
useState for: activeTab, autoRefresh, parametricData
    ↓
render: [KPICard × 12], SprintTrendChart, DeveloperAnalysis, etc.
    ↓
DetailModal (on KPI click)
```

### KPICard.js (Reusable Metric Display)

**Props:**
```javascript
{
  title: string,           // e.g., "Avg Test Cases"
  value: number,          // e.g., 142
  unit: string,           // e.g., "cases/sprint"
  status: 'good'|'warning'|'critical',
  icon: React.Component,  // lucide-react icon
  tooltip: string,        // Hover explanation
  onClick: function       // Opens DetailModal
}
```

**Features:**
- Color-coded status indicator
- Responsive typography
- Hover tooltips with safe window access
- Click handler for drill-down
- Accessibility labels

### SprintTrendChart.js (Multi-Axis Visualization)

**Props:**
```javascript
{
  data: [
    {
      sprint: 'Sprint 16',
      bugs: 46,
      bugsResolved: 25,
      testCases: 135,
      velocity: 19,
      // ... normalized SQL/CSV field names
    },
    // ... more sprints
  ]
}
```

**Features:**
- Dual Y-axes (bugs, test cases)
- Smooth tension curves (0.4)
- Normalized field mapping (handles multiple naming conventions)
- Zero-division protection
- Accessibility region role

### QualityMetrics.js (Quality Indicators)

**Calculations (Normalized):**
- `defectDensity = bugs / testCases`
- `testAutomation = automated / total`
- `cyclTime = avg resolution days`
- `leakRate = escaped bugs / total`

**Field Mapping:**
Handles multiple naming conventions from SQL/CSV:
```javascript
sprint.testCases 
  || sprint.casosEjecutados 
  || sprint.test_cases 
  || 0
```

### DeveloperAnalysis.js (Team Workload)

**Displays:**
- Developer name
- Bugs assigned vs resolved
- Pending bugs count
- Efficiency percentage
- Workload level indicator

**Data Source:** Normalized from `developerData` array with fallback field names

### ModuleAnalysis.js (System Component Breakdown)

**Displays:**
- Module/component name
- Bug count and percentage
- Efficiency metrics
- Top developers for that module

**Validation:** Zero-division protection, validates data structure

### ActionableRecommendations.js (Data-Driven Suggestions)

**Generates recommendations based on:**
- Test case coverage
- Resolution efficiency
- Critical bug count
- Cycle time trends
- Developer workload distribution

**Output:**
- Prioritized action items
- Impact assessment
- Implementation guidance

### DetailModal.js (Drill-Down Analysis)

**Displays:**
- Detailed metric breakdown
- Trend charts
- Module/developer specifics
- Contextual recommendations
- Historical comparisons

**Data Flow:**
```
KPICard click
    ↓
setDetailModal({ type, title, data, sprints })
    ↓
DetailModal renders with TrendChart, RecommendationEngine
    ↓
Portal renders above other content
```

## 🔧 Data Processing & Normalization

### Field Name Mapping Strategy

**Problem:** SQL, CSV, and JavaScript use different naming conventions
- SQL: `bugs_encontrados`, `casos_ejecutados`
- CSV: `Bugs Encontrados`, `Casos Ejecutados`
- JS: `bugsFound`, `testCases`

**Solution:** Implement fallback chains in all calculations

**Example from dataProcessor.js:**
```javascript
const bugs = sprint.bugs 
  || sprint.bugs_encontrados 
  || sprint.defectos_encontrados 
  || 0;

const testCases = sprint.testCases 
  || sprint.casosEjecutados 
  || sprint.test_cases 
  || sprint.casos_ejecutados 
  || 0;
```

### QADataProcessor (Utility Class)

Located: `utils/dataProcessor.js`

**Static Methods:**
- `processQAData()` - Main processor, calls all transformations
- `calculateKPIs()` - Computes dashboard metrics
- `calculateAvgTestCasesPerSprint()` - With robust validation
- `calculateQualityIndex()` - Weighted multi-factor score
- `generateAlerts()` - Threshold-based alerts
- `generateRecommendations()` - Data-driven suggestions
- `generatePredictions()` - Future trend forecasting
- `calculateProcessMaturity()` - Team capability assessment

**Robustness Features:**
- `Number.isFinite()` checks prevent NaN propagation
- Division-by-zero protection
- Type validation before operations
- Fallback field names for CSV/SQL variants

### RecommendationEngine (Suggestion Generator)

Located: `utils/recommendationEngine.js`

**Static Methods:**
- `getRecommendations(category, data)` - Get suggestions for metric
- Supports: testCases, resolutionEfficiency, criticalBugs, cycleTime, etc.

**Categories:**
```javascript
{
  testCases: [...],              // Test coverage recommendations
  resolutionEfficiency: [...],   // Resolution speed suggestions
  criticalBugs: [...],           // Critical bug handling
  criticalBugsStatus: [...],     // Pending critical bugs
  cycleTime: [...]               // Cycle time optimization
}
```

## 🔌 API Endpoints

### `/api/qa-data` (Main Data Endpoint)

**Method:** GET

**Query Parameters:**
- `force` (optional): `true` or `1` to bypass cache

**Response:**
```javascript
{
  metadata: { version, source, lastUpdated },
  summary: { totalBugs, bugsClosed, testCases, ... },
  bugsByPriority: { 'Más alta': {...}, 'Alta': {...}, ... },
  bugsByModule: { 'POS': {...}, 'Inventory': {...}, ... },
  developerData: [ { name, assigned, resolved, pending }, ... ],
  sprintData: [ { sprint, bugs, bugsResolved, testCases, ... }, ... ],
  qualityMetrics: { defectDensity, testAutomation, cycleTime, ... },
  _dataSource: 'sqlite'|'json'|'fallback',
  _cached: boolean,
  _timestamp: number
}
```

### `/api/health` (Health Check)

**Purpose:** Deployment readiness probe

**Response:** 
- HTTP 200 if database responsive
- HTTP 503 if database unavailable

### `/api/config` (Configuration Endpoint)

**Returns:** Merged configuration (qa-config.json + app-settings.json)

### `/api/generate-status` (Data Generation Status)

**Returns:** Status of data generation/refresh operations

## 📊 Data Structure (Post-Processing)

### Sprint Data
```javascript
{
  sprint: 'Sprint 16',
  bugs: 46,                    // Total bugs found
  bugsResolved: 25,           // Bugs fixed
  bugsPending: 13,            // Bugs still open
  testCases: 135,             // Test cases executed
  testPlanned: 150,           // Test cases planned
  velocity: 19,               // Story points completed
  change: 0,                  // % change from prev sprint
  startDate: '2024-11-25'     // Sprint start
}
```

### Developer Data
```javascript
{
  name: 'Juan García',
  assigned: 8,                // Bugs assigned
  resolved: 5,               // Bugs fixed
  pending: 3,                // Bugs still open
  workload: 'Medium',        // Workload level
  efficiency: 62.5,          // % resolved / assigned
  avgResolutionTime: 3.2     // Days to resolve
}
```

### Quality Metrics
```javascript
{
  defectDensity: 0.34,       // Bugs per test case
  testAutomation: 45,        // % of tests automated
  cycleTime: 4.2,            // Days from report to resolution
  leakageRate: 8.5,          // % of bugs escaped to production
  reworkRate: 12,            // % of rework required
  firstPassYield: 88,        // % passed first time
  escapeRate: 15             // % of production bugs
}
```

## 🛠️ Development & Deployment

### CI/CD Pipeline

**Pre-deployment steps:**
```bash
# 1. Setup database (creates schema if not exists)
npm run db:setup

# 2. Generate JSON backup from database
npm run generate-json

# 3. Build project
npm run build

# 4. Start application
npm start
```

**Single command:**
```bash
npm run ci:prepare  # Runs setup + generation
```

### Environment Configuration

**Config Files (merged in order):**
1. `config/qa-config.json` (QA-specific settings)
2. `config/app-settings.json` (app overrides)
3. Environment variables (runtime overrides)

**Key Settings:**
- `autoRefresh`: Enable/disable auto-refresh
- `refreshInterval`: Milliseconds between refreshes
- `useParametricMode`: Enable parametric data loading
- `weights`: KPI calculation weights
- `thresholds`: Alert trigger thresholds

### Performance Optimization

**Current Optimizations:**
- ✅ 5-minute in-memory cache reduces DB queries
- ✅ Normalized SQL views for efficient aggregation
- ✅ React.useMemo() in components for expensive calculations
- ✅ Lazy loading of chart libraries
- ✅ Debounced auto-refresh

**Recommended Future Improvements:**
- React.memo() for chart components
- Virtual scrolling for large datasets
- Service Worker for offline support
- GraphQL instead of REST (optional)
- Database query optimization with indexes

## 📁 File Structure (Current)

```
DashboardDemo/
├─ lib/
│  ├─ config.js                 ← Configuration loader (paths, settings)
│  ├─ qaDataLoader.js           ← Main data loading (SQLite → JSON → fallback)
│  ├─ qaDataLoaderV2.js         ← Alternative loader (legacy)
│  ├─ excelProcessor.cjs        ← CSV/Excel parsing utilities
│  └─ database/
│     ├─ dal.js                 ← Data Access Layer (SQLite queries)
│     ├─ init.js                ← Database initialization
│     ├─ init.mjs               ← ES module variant
│     └─ schema.sql             ← SQLite schema definition
├─ pages/
│  ├─ api/
│  │  ├─ qa-data.js             ← Main data endpoint
│  │  ├─ qa-data-v2.js          ← Alternative data endpoint
│  │  ├─ config.js              ← Configuration endpoint
│  │  ├─ health.js              ← Health check probe
│  │  ├─ data-source.js         ← Data source info
│  │  ├─ debug-qa.js            ← Debug utilities
│  │  ├─ generate-status.js     ← Generation status
│  │  ├─ recommendations.js     ← Recommendations endpoint
│  │  ├─ generate-and-refresh.js ← Data refresh trigger
│  │  ├─ upload-data.js         ← Data upload
│  │  └─ verify-data.js         ← Data validation
│  ├─ qa-dashboard.js           ← Main dashboard page
│  ├─ config-dashboard.js       ← Configuration dashboard
│  └─ index.js                  ← Landing page
├─ components/
│  ├─ ExecutiveDashboard.js     ← Main orchestrator
│  ├─ KPICard.js                ← Reusable KPI display
│  ├─ SprintTrendChart.js       ← Trend visualization
│  ├─ SprintComparison.js       ← Side-by-side comparison
│  ├─ DeveloperAnalysis.js      ← Team workload analysis
│  ├─ ModuleAnalysis.js         ← Module bug breakdown
│  ├─ QualityMetrics.js         ← Quality indicators
│  ├─ ActionableRecommendations.js ← Suggested actions
│  ├─ ExecutiveRecommendations.js  ← Executive summary
│  ├─ DetailModal.js            ← Drill-down modal
│  ├─ UnderConstructionCard.js  ← Placeholder component
│  └─ UploadData.js             ← Data upload interface
├─ utils/
│  ├─ dataProcessor.js          ← KPI calculations & normalization
│  └─ recommendationEngine.js   ← Recommendation generation
├─ config/
│  ├─ qa-config.json            ← QA settings
│  └─ app-settings.json         ← Application settings
├─ data/
│  ├─ MockDataV0.csv            ← Source data (1000+ records)
│  └─ qa-data.json              ← Non-public JSON cache (generated)
├─ public/
│  └─ data/
│     ├─ qa-dashboard.db        ← SQLite database (primary source)
│     ├─ qa-data.json           ← Public JSON backup
│     └─ recommendations.json   ← Generated recommendations
├─ styles/
│  └─ globals.css               ← Tailwind styles
├─ scripts/
│  ├─ analyze-*.js              ← Data analysis tools
│  ├─ setup-sqlite.mjs          ← Database setup
│  ├─ generate*.js              ← Data generation
│  ├─ migrate*.mjs              ← Data migration
│  └─ ... (various utilities)
├─ ARCHITECTURE.md              ← This file (architecture reference)
├─ README.md                    ← User guide
├─ package.json                 ← Dependencies & scripts
└─ next.config.js               ← Next.js configuration
```

## 🚀 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│  ExecutiveDashboard.js (orchestrator)                            │
│  ├─ KPICard (× 12 metric displays)                               │
│  ├─ SprintTrendChart (visualization)                             │
│  ├─ DeveloperAnalysis (team workload)                            │
│  ├─ ModuleAnalysis (component breakdown)                         │
│  ├─ ActionableRecommendations (suggestions)                      │
│  └─ DetailModal (drill-down analysis)                            │
└────────────────────────┬──────────────────────────────────────────┘
                         │ fetch('/api/qa-data')
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API Layer (Next.js)                             │
│  pages/api/qa-data.js                                            │
│  └─ getQAData({ forceReload })                                   │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Data Loading Layer                              │
│  lib/qaDataLoader.js                                             │
│  ├─ [1] Check in-memory cache (5 min TTL)                        │
│  ├─ [2] Load from SQLite via DAL.getFullQAData()                 │
│  ├─ [3] Fallback to JSON (public/data/qa-data.json)              │
│  ├─ [4] Final fallback to minimal safe data                      │
│  └─ [5] Cache result (5 min)                                     │
└────────────────────────┬──────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│ SQLite Database  │ │ JSON Backup  │ │ Safe Default │
│ (Primary)        │ │ (Fallback)   │ │ (Emergency)  │
│ qa-dashboard.db  │ │ qa-data.json │ │ Empty data   │
│                  │ │              │ │              │
│ ✅ Real data     │ │ Generated    │ │ ✅ Always    │
│ ✅ Normalized    │ │ via CI/CD    │ │    works     │
│ ✅ Indexed       │ │              │ │              │
└──────────────────┘ └──────────────┘ └──────────────┘
         ▲                              
         │                              
    ┌────┴────────┐                    
    ▼             ▼                    
MockDataV0.csv  (import)            
├─ 1000+ records
├─ Normalized schema
└─ Multi-field mappings
```

## 🔐 Security & Best Practices

### Data Validation
- ✅ Type checking before calculations
- ✅ Null/undefined guards with fallbacks
- ✅ Zero-division protection
- ✅ Safe window access checks (typeof window)

### Error Handling
- ✅ Try-catch blocks in loaders
- ✅ Graceful degradation (fallback data)
- ✅ Error logging without exposing internals
- ✅ User-friendly error messages

### Performance
- ✅ 5-minute cache prevents excessive DB queries
- ✅ SQL views pre-aggregate data
- ✅ Lazy component loading
- ✅ Debounced refresh operations

### Maintainability
- ✅ Clean architecture layers (data → processing → presentation)
- ✅ Centralized configuration
- ✅ Documented data normalization
- ✅ Consistent naming conventions

## 🧑‍💻 Development Guidelines

### Adding a New KPI

1. **Add calculation in `utils/dataProcessor.js`:**
   ```javascript
   static calculateNewMetric(data) {
     // With fallback field names
     const value = data.field || data.field_alt || 0;
     return Math.round(value * 100) / 100;
   }
   ```

2. **Reference in `calculateKPIs()`:**
   ```javascript
   newMetric: this.calculateNewMetric(rawData)
   ```

3. **Create KPICard in ExecutiveDashboard:**
   ```javascript
   <KPICard 
     title="New Metric"
     value={data.kpis.newMetric}
     unit="units"
     icon={IconComponent}
   />
   ```

4. **Add recommendations in `recommendationEngine.js`** (optional)

### Modifying Data Structure

1. Update SQL schema in `lib/database/schema.sql`
2. Update DAL methods in `lib/database/dal.js`
3. Update component field mappings with fallbacks
4. Test with `npm run db:setup` && `npm run generate-json`

### Debugging

```bash
# View current data
curl http://localhost:3000/api/qa-data

# Force cache refresh
curl http://localhost:3000/api/qa-data?force=1

# Check health
curl http://localhost:3000/api/health

# View config
curl http://localhost:3000/api/config
```
