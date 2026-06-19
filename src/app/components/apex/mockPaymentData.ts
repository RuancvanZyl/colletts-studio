import { Payment, Message } from './types';

export const mockPayments: Payment[] = [
  {
    id: 'PAY-001',
    trophyId: 'TRP-001',
    amount: 2500,
    currency: 'USD',
    type: 'deposit',
    status: 'completed',
    method: 'Credit Card',
    date: '2025-10-15T10:00:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-002',
    trophyId: 'TRP-001',
    amount: 5000,
    currency: 'USD',
    type: 'partial',
    status: 'completed',
    method: 'Wire Transfer',
    date: '2025-10-28T14:30:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-003',
    trophyId: 'TRP-001',
    amount: 2500,
    currency: 'USD',
    type: 'final',
    status: 'pending',
    method: 'Credit Card',
    date: '2025-11-03T00:00:00Z',
    dueDate: '2025-11-10T00:00:00Z',
    invoiceUrl: '#'
  },
  {
    id: 'PAY-004',
    trophyId: 'TRP-002',
    amount: 3000,
    currency: 'USD',
    type: 'deposit',
    status: 'completed',
    method: 'Credit Card',
    date: '2025-09-20T10:00:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-005',
    trophyId: 'TRP-002',
    amount: 6000,
    currency: 'USD',
    type: 'final',
    status: 'completed',
    method: 'Credit Card',
    date: '2025-10-25T16:45:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-006',
    trophyId: 'TRP-003',
    amount: 1500,
    currency: 'USD',
    type: 'deposit',
    status: 'completed',
    method: 'Wire Transfer',
    date: '2025-10-28T10:00:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-007',
    trophyId: 'TRP-004',
    amount: 2000,
    currency: 'USD',
    type: 'deposit',
    status: 'completed',
    method: 'Credit Card',
    date: '2025-09-01T10:00:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-008',
    trophyId: 'TRP-004',
    amount: 4000,
    currency: 'USD',
    type: 'final',
    status: 'completed',
    method: 'Credit Card',
    date: '2025-10-15T16:45:00Z',
    invoiceUrl: '#',
    receiptUrl: '#'
  },
  {
    id: 'PAY-009',
    trophyId: 'TRP-004',
    amount: 500,
    currency: 'USD',
    type: 'shipping',
    status: 'processing',
    method: 'Credit Card',
    date: '2025-11-02T10:15:00Z',
    dueDate: '2025-11-05T00:00:00Z',
    invoiceUrl: '#'
  }
];

export const mockMessages: Message[] = [
  {
    id: 'M1',
    sender: 'ai',
    content: 'Hello! I\'m your APEX Trophy assistant. How can I help you today?',
    timestamp: '2025-11-03T09:00:00Z',
    read: true
  },
  {
    id: 'M2',
    sender: 'user',
    content: 'What\'s the status of my Lion trophy?',
    timestamp: '2025-11-03T09:01:00Z',
    read: true
  },
  {
    id: 'M3',
    sender: 'ai',
    content: 'Your African Lion (TRP-001) is currently in the Tannery stage, with the cape skin being processed. The skull is in the Boiling Room. Overall progress is at 60%. Would you like more details about any specific part?',
    timestamp: '2025-11-03T09:01:30Z',
    read: true
  },
  {
    id: 'M4',
    sender: 'user',
    content: 'When will it be ready for shipping?',
    timestamp: '2025-11-03T09:02:00Z',
    read: true
  },
  {
    id: 'M5',
    sender: 'ai',
    content: 'Based on the current progress and typical processing times, your Lion trophy is estimated to be ready for shipping in approximately 3-4 weeks. This includes completing the tannery process, mounting, quality check, and packing. I\'ll send you notifications as it progresses through each stage!',
    timestamp: '2025-11-03T09:02:45Z',
    read: true
  }
];
