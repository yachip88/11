# Design Guidelines: Heating Network Monitoring Dashboard

## Design Approach
**System Selected**: Carbon Design System (IBM) - purpose-built for data-intensive industrial applications
**Rationale**: Enterprise-grade framework optimized for information density, technical workflows, and operational clarity

## Core Design Principles
1. **Data Primacy**: Information architecture prioritizes rapid data comprehension
2. **Industrial Precision**: Technical aesthetic with engineering-grade clarity
3. **Operational Efficiency**: Minimize cognitive load for time-critical decision-making

---

## Color System

### Functional Data States
- **Normal Operations**: `142 76% 36%` (green) - stable parameters
- **Important Data**: `210 100% 45%` (blue) - key metrics requiring attention  
- **Critical Alerts**: `0 84% 60%` (red) - immediate action required
- **Warning State**: `38 92% 50%` (amber) - threshold approaching

### Dark Mode Foundation
- **Background Primary**: `220 13% 9%` 
- **Background Secondary**: `220 13% 13%`
- **Background Elevated**: `220 13% 18%`
- **Border/Divider**: `220 13% 25%`
- **Text Primary**: `210 17% 98%`
- **Text Secondary**: `210 11% 71%`
- **Text Muted**: `210 9% 53%`

---

## Typography

**Font Stack**: IBM Plex Sans (technical precision) via Google Fonts CDN

### Hierarchy
- **Dashboard Titles**: 24px/700 (section headers)
- **Card Headers**: 18px/600 (data module titles)
- **Data Labels**: 14px/500 (metric identifiers)
- **Primary Data**: 32px/700 mono (key numerical values)
- **Table Content**: 13px/400 (dense information)
- **Metadata**: 11px/400 (timestamps, units)

---

## Layout System

**Spacing Primitives**: Tailwind units of 1, 2, 4, 6, 8, 12, 16
- Grid gaps: `gap-4` (component separation)
- Card padding: `p-6` (internal spacing)
- Section margins: `mb-8` (vertical rhythm)
- Dense tables: `p-2` (compact data)

**Grid Structure**:
- 12-column responsive grid
- Sidebar: 280px fixed (navigation tree)
- Main content: fluid with `max-w-screen-2xl`
- Card layouts: `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`

---

## Component Library

### Navigation
**Hierarchical Sidebar Tree**:
- Three-level structure (РТС → Микрорайоны → ЦТП)
- Expandable nodes with chevron indicators
- Active state: blue left border (4px) + background tint
- Compact mode toggle for screen space

### Data Visualization Cards
**Statistics Cards** (grid layout):
- Value display: Large mono numerals with unit labels
- Status indicator: 8px dot (green/blue/red) top-right
- Trend arrows: ↑↓ with 24-hour delta percentage
- Subtle shadow: `shadow-lg` on dark background

**Shewhart Control Charts**:
- Canvas-based rendering (Chart.js/D3)
- UCL/LCL lines: dashed white `opacity-40`
- Data points: 6px circles, color-coded by state
- Real-time update indicator: pulsing dot

### Data Tables
**Dense Information Grid**:
- Zebra striping: alternate `bg-opacity-5` rows
- Fixed header on scroll: `sticky top-0`
- Sortable columns: arrow indicators
- Inline status badges: pill-shaped, 6px height
- Compact cells: `px-3 py-2`
- Monospace for numerical columns

### Action Components
**Toolbar Controls**:
- Time range selector: segmented button group
- Filter dropdowns: dark themed select menus
- Export button: icon + label, secondary style
- Refresh indicator: animated spinner when active

**Alert Panel** (top-right):
- Toast-style notifications
- Critical alerts: red left accent (4px)
- Auto-dismiss: 8 seconds (non-critical)
- Action buttons: compact, high contrast

---

## Accessibility & Dark Mode

### Contrast Requirements
- All data text: minimum 7:1 contrast ratio
- Interactive elements: 4.5:1 minimum
- Status indicators: shape + color redundancy

### Form Inputs (Dark Consistent)
- Input backgrounds: `220 13% 13%`
- Borders: `220 13% 25%` default, blue on focus
- Placeholder text: `210 9% 53%`
- Active state: blue glow `shadow-[0_0_0_3px_rgba(56,139,253,0.25)]`

---

## Special Features

### Real-Time Updates
- WebSocket status indicator: connection dot (green/red)
- Data refresh animations: subtle fade-in
- Change highlighting: brief yellow flash on value update

### Responsive Breakpoints
- **Mobile** (< 768px): Single column, collapsible sidebar
- **Tablet** (768-1024px): 2-column grids
- **Desktop** (> 1024px): Full 3-column layouts
- **Wide** (> 1920px): 4-column option for statistics

---

## Images
**No hero images required** - Dashboard interface focused on data density. Use:
- System diagrams: Network topology visualizations (SVG icons for RTS/CTP nodes)
- Equipment icons: Minimal line-art style for hierarchy tree
- Status icons: Heroicons for UI controls (settings, filters, export)