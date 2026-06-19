export type TrophyStatus = 
  | 'received' 
  | 'cleaning' 
  | 'tannery' 
  | 'boiling' 
  | 'mounting' 
  | 'qc' 
  | 'packed' 
  | 'dispatched' 
  | 'delivered';

export type PartType = 'skull' | 'horns' | 'cape_skin' | 'full_skin' | 'tusks';

export interface TrophyPart {
  id: string;
  type: PartType;
  status: TrophyStatus;
  zone: string;
  lastUpdated: string;
}

export interface Trophy {
  id: string;
  species: string;
  clientName: string;
  progress: number;
  currentStage: TrophyStatus;
  parts: TrophyPart[];
  imageUrl?: string;
  createdAt: string;
  lastUpdated: string;
  events: TrophyEvent[];
}

export interface TrophyEvent {
  id: string;
  type: TrophyStatus;
  zone: string;
  timestamp: string;
  operator?: string;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  trophyCount: number;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  dateOfBirth?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  emergencyContact?: EmergencyContact;
  preferredPaymentMethod?: string;
  taxId?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Payment {
  id: string;
  trophyId: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'partial' | 'final' | 'shipping';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  method: string;
  date: string;
  dueDate?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'support';
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

export interface Notification {
  id: string;
  type: 'update' | 'shipment' | 'alert';
  message: string;
  timestamp: string;
  read: boolean;
  trophyId?: string;
}

export type TrophyType = 
  | 'shoulder-mount'
  | 'full-body-mount'
  | 'pedestal-mount'
  | 'euro-mount'
  | 'tan-to-fur'
  | 'custom-design';

export interface AnimalSpecies {
  id: string;
  name: string;
  category: 'big-game' | 'small-game' | 'exotic' | 'plains-game';
  imageUrl: string;
}

export interface TrophySelection {
  id: string;
  animal: AnimalSpecies;
  trophyType: TrophyType;
  customDescription?: string;
  customImages?: string[];
  number?: number; // For when multiple of same species
}

// Outfitter Portal Types

export type OutfitterDocumentType = 
  | 'id-copy'
  | 'outfitter-licence'
  | 'hunting-permit'
  | 'insurance-certificate';

export type DocumentStatus = 'valid' | 'expiring-soon' | 'expired' | 'pending';

export interface OutfitterDocument {
  id: string;
  type: OutfitterDocumentType;
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  status: DocumentStatus;
  fileUrl?: string;
}

export type OutfitterStatus = 'pending-review' | 'approved' | 'expired' | 'suspended';

export interface Outfitter {
  id: string;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  farmName: string;
  avatar?: string;
  status: OutfitterStatus;
  documents: OutfitterDocument[];
  registeredDate: string;
  lastActive: string;
}

export type HuntStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Hunt {
  id: string;
  name: string;
  outfitterId: string;
  hunterId?: string;
  hunterName: string;
  region: string;
  province: string;
  farm: string;
  startDate: string;
  endDate: string;
  animalCount: number;
  animals: string[]; // Species names
  status: HuntStatus;
  notes?: string;
  registerDocument?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HuntStatistics {
  totalHuntsThisYear: number;
  totalHuntersGuided: number;
  totalAnimalsHarvested: number;
  mostCommonSpecies: string;
  topHuntingLocation: string;
}

export interface OutfitterChat {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'hunter' | 'taxidermy' | 'admin';
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  avatar?: string;
}
