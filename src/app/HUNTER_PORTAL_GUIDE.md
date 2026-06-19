# Hunter Portal - Complete Flow Guide

## 🎯 Overview

The Hunter Portal now features a comprehensive registration and onboarding flow that guides hunters from initial signup through trophy submission and tracking.

## 📋 Flow Architecture

```
Registration
    ↓
Verification Pending
    ↓
Onboarding (Create Hunt)
    ↓
Active Hunt Dashboard
    ↓
Add Trophy Flow (Repeatable)
    ↓
Submit to Taxidermy
    ↓
Trophy Tracking Dashboard
```

## 🔄 Flow States

The Hunter Portal uses a state machine with the following flows:

### 1. **registration**
- **Component**: `HunterRegistration.tsx`
- **Purpose**: New hunter account creation
- **Features**:
  - Personal information form
  - ID/Passport upload
  - Shipping address collection
  - Terms acceptance
- **Next**: `pending-verification`

### 2. **pending-verification**
- **Component**: `VerificationPending.tsx`
- **Purpose**: Waiting for admin approval
- **Features**:
  - Status display
  - What's next information
  - Estimated processing time
- **Next**: `onboarding` (after approval)

### 3. **onboarding**
- **Component**: `HunterOnboarding.tsx`
- **Purpose**: First-time setup - create hunt and link outfitter
- **Features**:
  - Hunt creation form
  - Outfitter search/linking
  - Hunt ID generation
  - Date selection
  - Location details
- **Generates**: `HUNT-YYYY-####` unique ID
- **Next**: `active-hunt`

### 4. **active-hunt**
- **Component**: `ActiveHuntDashboard.tsx`
- **Purpose**: Manage current hunt and add trophies
- **Features**:
  - Hunt summary card
  - Trophy list
  - Add trophy button
  - Submit hunt action
- **Next**: `add-trophy` or `tracking`

### 5. **add-trophy**
- **Component**: `AddTrophyFlow.tsx`
- **Purpose**: 3-step wizard to record harvested animals
- **Steps**:
  1. Animal Details (species, gender, photos)
  2. Trophy Type Selection (6 types)
  3. Summary & Confirmation
- **Generates**: `TRP-YYYY-#####` unique ID
- **Next**: Back to `active-hunt`

### 6. **tracking**
- **Component**: `TrophyTrackingDashboard.tsx`
- **Purpose**: Post-submission trophy tracking
- **Features**:
  - Trophy grid view
  - Status badges
  - Progress bars
  - Timeline viewer
  - Filter tabs (All, In Process, Completed, Shipped)
- **Status Flow**: Received → Tannery → Mounting → QA → Packed → Shipped → Delivered

### 7. **main**
- **Purpose**: Regular portal access (existing functionality)
- **Views**: Home, Trophies, Notifications, Profile
- **For**: Returning users with completed setup

## 🧪 Testing Different Flows

To test different flows, edit `/components/apex/HunterPortal.tsx`:

```typescript
// Line 29: Change the initial flow state
const [flow, setFlow] = useState<HunterFlow>('main'); // Default
```

### Testing Options:

```typescript
// Test registration
const [flow, setFlow] = useState<HunterFlow>('registration');

// Test verification pending
const [flow, setFlow] = useState<HunterFlow>('pending-verification');

// Test onboarding
const [flow, setFlow] = useState<HunterFlow>('onboarding');

// Test active hunt
const [flow, setFlow] = useState<HunterFlow>('active-hunt');

// Test add trophy
const [flow, setFlow] = useState<HunterFlow>('add-trophy');

// Test tracking
const [flow, setFlow] = useState<HunterFlow>('tracking');

// Normal portal (default)
const [flow, setFlow] = useState<HunterFlow>('main');
```

## 🎨 Design System

### Colors
- **Primary**: Hunter Green (`from-green-700 to-lime-600`)
- **Background**: Soft gradients (`from-stone-50 via-green-50/30 to-stone-100`)
- **Accents**: Natural earth tones

### Components Used
- **Cards**: Rounded with soft shadows
- **Buttons**: Gradient fills on primary actions
- **Progress**: Step indicators and progress bars
- **Badges**: Status indicators with contextual colors
- **Upload**: Drag-and-drop with preview

### Status Colors
- **Pending**: Amber
- **Linked/Active**: Green
- **In Process**: Blue/Purple
- **Completed**: Green
- **Shipped**: Orange

## 📱 Mobile Responsive

All components are fully responsive:
- **Mobile**: Vertical flow, floating action buttons
- **Tablet**: Optimized grid layouts
- **Desktop**: Full-width forms with side-by-side fields

### Mobile Features
- Touch-friendly buttons (44px minimum)
- Collapsible sections
- Bottom sheet dialogs
- Floating add button on tracking dashboard

## 🔐 Security Features

- ID verification required
- Admin approval before access
- Document upload (PDF, JPG, PNG)
- Secure data storage consent
- Protected routes based on verification status

## 📊 Data Flow

### Hunt Creation
```
Hunter creates hunt → Generates Hunt ID → Sends link to Outfitter
→ Outfitter confirms → Status: Linked ✅
```

### Trophy Addition
```
Select species → Upload photos → Choose mount type
→ Generate Trophy ID → Save to hunt → Can add more
```

### Trophy Submission
```
Submit hunt → Notify Taxidermy → Sync with Outfitter
→ Begin tracking → Updates flow to all portals
```

## 🎯 Trophy Types

1. **Shoulder Mount** - Head and shoulders on plaque
2. **Full Body Mount** - Complete animal in lifelike pose
3. **Pedestal Mount** - Full body on decorative base
4. **Euro Mount** - Cleaned and whitened skull
5. **Tan to Fur (Rug)** - Full hide preserved as rug
6. **Custom Design** - User-defined with description

## 🔔 Notifications

Automatic notifications sent at:
- Registration submitted
- Account approved
- Outfitter linked
- Trophy status updates
- Hunt submitted
- Quality check complete
- Ready for shipment
- Delivered

## 🚀 Integration Points

### With Outfitter Portal
- Shared Hunt IDs
- Hunt confirmation requests
- Trophy sync
- Communication panel

### With Taxidermy Portal
- Trophy intake
- Status updates
- RFID scanning
- Progress tracking

## 📝 Form Validation

### Required Fields
- Full name, email, phone
- Country and ID number
- ID document upload
- Complete shipping address
- Terms acceptance

### Trophy Addition
- Species selection
- Gender
- Trophy type
- Auto-generated IDs

## 🎓 User Experience

### Empty States
- Friendly messages
- Clear call-to-action
- Visual icons
- Helpful suggestions

### Success States
- Toast notifications
- Confirmation modals
- Progress indicators
- Status badges

### Error Handling
- Form validation
- Required field indicators
- Error boundaries
- Helpful error messages

## 📈 Analytics Tracking Points

- Registration completions
- Verification approval time
- Hunt creation rate
- Trophy addition count
- Submission to tracking conversion
- Trophy type distribution
- Average processing time

## 🔧 Customization

### Adding New Trophy Types
Edit `/components/apex/hunter/AddTrophyFlow.tsx`:

```typescript
const trophyTypes = [
  {
    id: 'new-type',
    name: 'New Trophy Type',
    description: 'Description here',
    icon: '🎯'
  },
  // ... existing types
];
```

### Modifying Status Flow
Edit `/components/apex/hunter/TrophyTrackingDashboard.tsx`:

```typescript
const getStatusDetails = (status: string) => {
  // Add new status
  newstatus: { 
    label: 'New Status', 
    color: 'bg-color', 
    icon: Icon 
  },
};
```

## 🎯 Best Practices

1. **Always validate user input** before proceeding
2. **Show progress indicators** on multi-step flows
3. **Provide clear feedback** via toasts and badges
4. **Enable cancellation** at any point
5. **Save draft data** when possible
6. **Mobile-first design** for all components
7. **Accessible** - keyboard navigation, screen readers
8. **Performance** - lazy load images, optimize bundles

---

**Built for Apex Trophy Solutions** - Connecting hunters, outfitters, and taxidermists in one seamless platform.
