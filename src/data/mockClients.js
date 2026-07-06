export const clientTypes = [
  'Individual',
  'Corporate',
  'Government',
  'NGO',
  'Other'
];

export const clientStatuses = [
  'Active',
  'New',
  'Archived'
];

export const mockClients = [
  {
    id: 'client-1',
    name: 'Ramesh Sharma',
    phone: '+91 98765 43210',
    email: 'ramesh.sharma@example.com',
    address: '123 Civil Lines, New Delhi, Delhi 110001',
    type: 'Individual',
    notes: 'Land dispute case with high priority. Next hearing on 2024-07-15',
    createdDate: '2024-01-15',
    status: 'Active'
  },
  {
    id: 'client-2',
    name: 'Priya Enterprises Pvt Ltd',
    phone: '+91 11 2345 6789',
    email: 'contact@priyaenterprises.in',
    address: '456 Connaught Place, New Delhi, Delhi 110001',
    type: 'Corporate',
    notes: 'Commercial contract dispute. Case in Supreme Court',
    createdDate: '2024-02-20',
    status: 'Active'
  },
  {
    id: 'client-3',
    name: 'Sunita Verma',
    phone: '+91 98123 45678',
    email: 'sunita.verma@example.org',
    address: '789 Sector 18, Noida, Uttar Pradesh 201301',
    type: 'Individual',
    notes: 'Family law matter. Handle with sensitivity',
    createdDate: '2024-03-10',
    status: 'New'
  },
  {
    id: 'client-4',
    name: 'Urban Development Authority',
    phone: '+91 11 2345 9876',
    email: 'uda@delhi.gov.in',
    address: '10 Rajiv Chowk, New Delhi, Delhi 110001',
    type: 'Government',
    notes: 'Land acquisition matter',
    createdDate: '2023-12-05',
    status: 'Archived'
  }
];
