# Apex Trophy Solutions

A comprehensive web application connecting hunters, outfitters, and taxidermists in one unified trophy management ecosystem.

## 🌟 Overview

Apex Trophy Solutions provides three interconnected portals with real-time tracking, secure communication, and comprehensive management tools for the entire trophy journey from hunt to delivery.

## 🎯 Features

### Landing Page
- **Clean, Modern Design**: Minimal interface with clear portal selection
- **Dark Mode Support**: Toggle between light and dark themes
- **Responsive Layout**: Mobile-first design that works on all devices
- **About Dialog**: Comprehensive information about the platform
- **Smooth Animations**: Fade-in and slide-in effects for better UX

### Authentication System
- **Portal-Specific Login**: Different login flows for each portal type
- **Registration Flow**: Complete registration with document upload for business accounts
- **Remember Me**: Persistent login option
- **Password Recovery**: Forgot password functionality
- **Portal Selector**: Switch between portals during login

### Three Integrated Portals

#### 1️⃣ Hunter Portal (Green)
**Purpose**: Client-facing experience for hunters to track trophies and manage hunts

**Features**:
- Trophy tracking dashboard with real-time status updates
- Timeline view showing each stage from receipt to delivery
- Create and manage hunts
- Select trophy mount types (Shoulder Mount, Full Body, Pedestal, Euro, Rug)
- Upload animal photos with auto-generated Trophy IDs
- Notifications system for status updates
- AI Assistant for instant help
- Profile management
- Payment tracking

**Key Screens**:
- Home Dashboard
- My Trophies
- Trophy Detail with Timeline
- Trophy Selection Wizard
- Notifications
- Profile & Settings

#### 2️⃣ Outfitter Portal (Amber)
**Purpose**: For professional hunters to manage hunts, clients, and compliance

**Features**:
- Hunt creation and management
- Link hunters to hunts via email or Hunt ID
- Animal species summary with tracking
- Communication panel for client interaction
- Document compliance tracking (Permits, CITES, Export)
- Performance analytics and reporting
- Profile and business management

**Key Screens**:
- Hunt Dashboard
- Create New Hunt
- Linked Hunters
- Animal Summary
- Communication Panel
- Documents & Compliance
- Performance Analytics
- Profile

#### 3️⃣ Taxidermy Portal (Blue)
**Purpose**: Back-office management for taxidermy workshop operations

**Features**:
- **Workshop Dashboard**: Real-time production overview with metrics
- **Part Scanning Station**: RFID/QR/Manual scanning with batch processing
- **Arrival Check-In**: Trophy intake with photo upload
- **Skin Processing**: Cleaning, salting, and tannery prep workflow
- **Skull Processing**: Euro mount preparation with bleaching
- **Storage Management**: Three-tier location system (Section/Rack/Bin)
- **Mounting Station**: Assembly and sewing with checklist
- **Finishing Station**: Detailing, painting, and habitat creation
- **Quality Inspection**: Pass/Fail workflow with photo documentation
- **Packing & Shipping**: Complete logistics with tracking
- **Inventory View**: Comprehensive parts tracking with alerts
- **Admin Configuration**: Staff, stations, storage, and settings management

**Key Screens**:
- Workshop Dashboard (with activity feed and department status)
- Part Scanning & Movement (12 processing stations)
- Arrival Check-In
- Skin Processing (Cleaning & Salting)
- Skull Processing (Clean & Bleach)
- Storage Management
- Mounting Station
- Finishing Station
- Quality Inspection
- Packing & Shipping (dual-tab interface)
- Inventory View (with filtering and alerts)
- Admin Configuration (Staff, Stations, Storage, Settings)

**Processing Stages**:
1. Receiving → 2. Cleaning/Bleaching → 3. Storage (Pre) → 4. Tannery Dispatch → 
5. Tannery Return → 6. Storage (Post) → 7. Mounting → 8. Finishing → 
9. Quality Check → 10. Packing → 11. Shipping

**See**: [Complete Taxidermy Portal Guide](TAXIDERMY_PORTAL_GUIDE.md)

## 🔄 Data Flow & Integration

### Shared Hunt IDs
All three portals are connected through shared Hunt IDs that link:
- Hunter creates or receives hunt from Outfitter
- Outfitter creates hunts and links hunters
- Taxidermy receives trophies from the hunt for processing

### Real-time Synchronization
- Trophy status updates flow from Taxidermy → Hunter
- Hunt information syncs between Outfitter → Hunter
- Notifications sent across portals for key events

### Trophy Journey Workflow
1. **Hunt Creation** (Outfitter or Hunter)
2. **Trophy Intake** (Taxidermy)
3. **Processing Stages** (Taxidermy):
   - Received
   - In Preparation
   - Tanning
   - Mounting
   - Quality Check
   - Ready for Dispatch
4. **Delivery** (Taxidermy → Hunter)

## 🎨 Design System

### Color Scheme
- **Hunter Portal**: Green/Lime gradient (`from-green-700 to-lime-600`)
- **Outfitter Portal**: Amber/Orange gradient (`from-amber-700 to-orange-600`)
- **Taxidermy Portal**: Blue/Cyan gradient (`from-blue-700 to-cyan-600`)
- **Neutral Base**: Stone/Slate colors for backgrounds
- **Dark Mode**: Full support with smooth transitions

### Typography
- Primary Font: System fonts optimized for readability
- Headings: Medium weight (500)
- Body: Normal weight (400)
- Responsive sizing based on viewport

### Components
- Rounded cards with soft shadows
- Gradient buttons with hover effects
- Badge components for status indication
- Progress rings for completion tracking
- Timeline components for trophy journey

## 🧩 Component Structure

### Main Components
```
/components/apex/
├── LandingPage.tsx           # Main landing with portal selection
├── LoginScreen.tsx           # Unified login
├── RegisterScreen.tsx        # User registration
├── AboutDialog.tsx           # About modal
├── ApexDashboard.tsx         # Unified dashboard
├── HunterPortal.tsx          # Hunter portal root
├── OutfitterPortal.tsx       # Outfitter portal root
├── TaxidermyPortal.tsx       # Taxidermy workshop portal root (NEW)
├── AdminPortal.tsx           # Legacy admin portal (deprecated)
├── ThemeProvider.tsx         # Dark mode management
├── PortalThemeProvider.tsx   # Portal-specific theming
├── ErrorBoundary.tsx         # Error handling
├── StatusBadge.tsx           # Status display component
├── ProgressRing.tsx          # Circular progress
```

### Hunter Portal Components
```
/components/apex/hunter/
├── HunterHome.tsx            # Dashboard
├── MyTrophies.tsx            # Trophy list
├── TrophyDetail.tsx          # Individual trophy view
├── TrophySelection.tsx       # Trophy selection wizard
├── Notifications.tsx         # Notification center
├── PaymentStatus.tsx         # Payment tracking
├── HunterProfile.tsx         # Profile management
├── AIAssistant.tsx           # AI help
└── trophy-selection/         # Selection wizard steps
    ├── AnimalSelection.tsx
    ├── TrophyTypeSelection.tsx
    └── SelectionSummary.tsx
```

### Outfitter Portal Components
```
/components/apex/outfitter/
├── HuntDashboard.tsx         # Main dashboard
├── CreateHunt.tsx            # Hunt creation form
├── LinkedHunters.tsx         # Hunter management
├── AnimalSummary.tsx         # Species tracking
├── CommunicationPanel.tsx    # Client messaging
├── DocumentsCompliance.tsx   # Document tracking
├── PerformanceAnalytics.tsx  # Analytics dashboard
└── OutfitterProfile.tsx      # Business profile
```

### Taxidermy Portal Components
```
/components/apex/taxidermy/          # NEW - Complete workshop system
├── WorkshopDashboard.tsx            # Real-time production overview
├── PartScanningStation.tsx          # RFID/QR/Manual scanning core
├── ArrivalCheckIn.tsx               # Trophy intake workflow
├── SkinProcessing.tsx               # Cleaning & salting station
├── SkullProcessing.tsx              # Euro mount preparation
├── StorageManagement.tsx            # 3-tier location system
├── MountingStation.tsx              # Assembly & sewing
├── FinishingStation.tsx             # Detailing & habitat
├── QualityInspection.tsx            # Pass/Fail QC workflow
├── PackingShipping.tsx              # Complete logistics
├── InventoryView.tsx                # Parts tracking with alerts
└── AdminConfiguration.tsx           # System settings
```

### Legacy Components (Deprecated)
```
/components/apex/admin/              # Old taxidermy portal
├── ReceptionDashboard.tsx    # Replaced by WorkshopDashboard
├── NewIntake.tsx             # Replaced by ArrivalCheckIn
├── ClientSearch.tsx          # Moved to admin config
├── ScanStation.tsx           # Replaced by PartScanningStation
├── QualityCheck.tsx          # Replaced by QualityInspection
├── StorageLocator.tsx        # Replaced by StorageManagement
└── Dispatch.tsx              # Replaced by PackingShipping
```

### Shared Components
```
/components/apex/shared/
├── UniversalAIAssistant.tsx  # Cross-portal AI
├── QuickActions.tsx          # Action shortcuts
└── PortalBreadcrumb.tsx      # Navigation breadcrumb
```

## 💡 Key Technologies

- **React**: Component-based UI
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Icon library
- **ShadCN UI**: Component library
- **Motion/React**: Animations
- **Recharts**: Data visualization

## 📊 Mock Data

The application includes comprehensive mock data:
- `mockData.ts`: Trophy and hunt data
- `mockOutfitterData.ts`: Hunt and client data
- `mockAnimalData.ts`: Animal species data
- `mockPaymentData.ts`: Payment information

## 🚀 Getting Started

1. Select your portal from the landing page
2. Login with your credentials
3. Navigate through portal-specific features
4. Use the AI Assistant for help
5. Toggle dark mode as needed

## 📞 Support

- Email: support@apextrophysolutions.com
- Phone: +1 (555) 123-4567
- Hours: Monday - Friday, 8AM - 6PM EST

## 🔐 Security Features

- Secure authentication per portal
- Role-based access control
- Protected routes
- Session management
- Error boundary protection

---

**Apex Trophy Solutions** - Connecting the hunting ecosystem with technology.