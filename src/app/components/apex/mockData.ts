import { Trophy, Client, Notification } from './types';

export const mockTrophies: Trophy[] = [
  {
    id: 'TRP-001',
    species: 'African Lion',
    clientName: 'John Hunter',
    progress: 60,
    currentStage: 'tannery',
    imageUrl: 'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=400',
    createdAt: '2025-10-15T10:00:00Z',
    lastUpdated: '2025-11-01T14:30:00Z',
    parts: [
      { id: 'P1', type: 'skull', status: 'boiling', zone: 'Boiling Room', lastUpdated: '2025-11-01T14:30:00Z' },
      { id: 'P2', type: 'cape_skin', status: 'tannery', zone: 'Tannery', lastUpdated: '2025-11-01T12:00:00Z' }
    ],
    events: [
      { id: 'E1', type: 'received', zone: 'Reception', timestamp: '2025-10-15T10:00:00Z', operator: 'Sarah M.' },
      { id: 'E2', type: 'cleaning', zone: 'Cleaning Station', timestamp: '2025-10-16T09:00:00Z', operator: 'Mike R.' },
      { id: 'E3', type: 'tannery', zone: 'Tannery', timestamp: '2025-10-20T08:00:00Z', operator: 'James T.' },
      { id: 'E4', type: 'boiling', zone: 'Boiling Room', timestamp: '2025-11-01T14:30:00Z', operator: 'David K.' }
    ]
  },
  {
    id: 'TRP-002',
    species: 'Cape Buffalo',
    clientName: 'John Hunter',
    progress: 80,
    currentStage: 'mounting',
    imageUrl: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400',
    createdAt: '2025-09-20T10:00:00Z',
    lastUpdated: '2025-10-30T16:45:00Z',
    parts: [
      { id: 'P3', type: 'skull', status: 'mounting', zone: 'Mounting Room', lastUpdated: '2025-10-30T16:45:00Z' },
      { id: 'P4', type: 'horns', status: 'mounting', zone: 'Mounting Room', lastUpdated: '2025-10-30T16:45:00Z' }
    ],
    events: [
      { id: 'E5', type: 'received', zone: 'Reception', timestamp: '2025-09-20T10:00:00Z', operator: 'Sarah M.' },
      { id: 'E6', type: 'cleaning', zone: 'Cleaning Station', timestamp: '2025-09-21T09:00:00Z', operator: 'Mike R.' },
      { id: 'E7', type: 'boiling', zone: 'Boiling Room', timestamp: '2025-09-25T08:00:00Z', operator: 'David K.' },
      { id: 'E8', type: 'mounting', zone: 'Mounting Room', timestamp: '2025-10-30T16:45:00Z', operator: 'Tom H.' }
    ]
  },
  {
    id: 'TRP-003',
    species: 'Leopard',
    clientName: 'John Hunter',
    progress: 40,
    currentStage: 'cleaning',
    imageUrl: 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=400',
    createdAt: '2025-10-28T10:00:00Z',
    lastUpdated: '2025-10-29T11:20:00Z',
    parts: [
      { id: 'P5', type: 'full_skin', status: 'cleaning', zone: 'Cleaning Station', lastUpdated: '2025-10-29T11:20:00Z' },
      { id: 'P6', type: 'skull', status: 'received', zone: 'Storage', lastUpdated: '2025-10-28T10:00:00Z' }
    ],
    events: [
      { id: 'E9', type: 'received', zone: 'Reception', timestamp: '2025-10-28T10:00:00Z', operator: 'Sarah M.' },
      { id: 'E10', type: 'cleaning', zone: 'Cleaning Station', timestamp: '2025-10-29T11:20:00Z', operator: 'Mike R.' }
    ]
  },
  {
    id: 'TRP-004',
    species: 'Kudu',
    clientName: 'John Hunter',
    progress: 90,
    currentStage: 'qc',
    imageUrl: 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?w=400',
    createdAt: '2025-09-01T10:00:00Z',
    lastUpdated: '2025-11-02T10:15:00Z',
    parts: [
      { id: 'P7', type: 'horns', status: 'qc', zone: 'QC Station', lastUpdated: '2025-11-02T10:15:00Z' },
      { id: 'P8', type: 'skull', status: 'qc', zone: 'QC Station', lastUpdated: '2025-11-02T10:15:00Z' }
    ],
    events: [
      { id: 'E11', type: 'received', zone: 'Reception', timestamp: '2025-09-01T10:00:00Z' },
      { id: 'E12', type: 'cleaning', zone: 'Cleaning Station', timestamp: '2025-09-02T09:00:00Z' },
      { id: 'E13', type: 'boiling', zone: 'Boiling Room', timestamp: '2025-09-05T08:00:00Z' },
      { id: 'E14', type: 'mounting', zone: 'Mounting Room', timestamp: '2025-10-15T16:45:00Z' },
      { id: 'E15', type: 'qc', zone: 'QC Station', timestamp: '2025-11-02T10:15:00Z', operator: 'Lisa P.' }
    ]
  },
  {
    id: 'TRP-005',
    species: 'Elephant',
    clientName: 'John Hunter',
    progress: 100,
    currentStage: 'delivered',
    imageUrl: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400',
    createdAt: '2025-08-01T10:00:00Z',
    lastUpdated: '2025-10-20T14:00:00Z',
    parts: [
      { id: 'P9', type: 'tusks', status: 'delivered', zone: 'Delivered', lastUpdated: '2025-10-20T14:00:00Z' },
      { id: 'P10', type: 'skull', status: 'delivered', zone: 'Delivered', lastUpdated: '2025-10-20T14:00:00Z' }
    ],
    events: [
      { id: 'E16', type: 'received', zone: 'Reception', timestamp: '2025-08-01T10:00:00Z' },
      { id: 'E17', type: 'cleaning', zone: 'Cleaning Station', timestamp: '2025-08-02T09:00:00Z' },
      { id: 'E18', type: 'boiling', zone: 'Boiling Room', timestamp: '2025-08-05T08:00:00Z' },
      { id: 'E19', type: 'mounting', zone: 'Mounting Room', timestamp: '2025-09-15T16:45:00Z' },
      { id: 'E20', type: 'qc', zone: 'QC Station', timestamp: '2025-10-01T10:15:00Z' },
      { id: 'E21', type: 'packed', zone: 'Packing', timestamp: '2025-10-05T11:00:00Z' },
      { id: 'E22', type: 'dispatched', zone: 'Dispatch', timestamp: '2025-10-10T08:00:00Z' },
      { id: 'E23', type: 'delivered', zone: 'Delivered', timestamp: '2025-10-20T14:00:00Z' }
    ]
  }
];

export const mockClients: Client[] = [
  {
    id: 'C1',
    name: 'John Hunter',
    email: 'john.hunter@email.com',
    phone: '+1 (555) 123-4567',
    trophyCount: 5,
    passportNumber: 'P12345678',
    passportExpiry: '2028-12-31',
    nationality: 'United States',
    dateOfBirth: '1975-06-15',
    shippingAddress: {
      street: '1234 Mountain View Drive',
      city: 'Denver',
      state: 'Colorado',
      postalCode: '80202',
      country: 'United States'
    },
    billingAddress: {
      street: '1234 Mountain View Drive',
      city: 'Denver',
      state: 'Colorado',
      postalCode: '80202',
      country: 'United States'
    },
    emergencyContact: {
      name: 'Jane Hunter',
      relationship: 'Spouse',
      phone: '+1 (555) 123-4568',
      email: 'jane.hunter@email.com'
    },
    preferredPaymentMethod: 'Credit Card',
    taxId: 'US-123-45-6789'
  },
  {
    id: 'C2',
    name: 'Sarah Williams',
    email: 'sarah.w@email.com',
    phone: '+1 (555) 234-5678',
    trophyCount: 3
  },
  {
    id: 'C3',
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    phone: '+1 (555) 345-6789',
    trophyCount: 7
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'N1',
    type: 'update',
    message: 'Cape skin entered Tannery',
    timestamp: '2025-11-03T12:34:00Z',
    read: false,
    trophyId: 'TRP-001'
  },
  {
    id: 'N2',
    type: 'update',
    message: 'Buffalo skull mounting complete',
    timestamp: '2025-11-02T16:45:00Z',
    read: false,
    trophyId: 'TRP-002'
  },
  {
    id: 'N3',
    type: 'shipment',
    message: 'Elephant tusks dispatched',
    timestamp: '2025-10-10T08:00:00Z',
    read: true,
    trophyId: 'TRP-005'
  },
  {
    id: 'N4',
    type: 'alert',
    message: 'Quality check required for Kudu',
    timestamp: '2025-11-02T10:15:00Z',
    read: false,
    trophyId: 'TRP-004'
  },
  {
    id: 'N5',
    type: 'update',
    message: 'Leopard cleaning in progress',
    timestamp: '2025-10-29T11:20:00Z',
    read: true,
    trophyId: 'TRP-003'
  }
];
