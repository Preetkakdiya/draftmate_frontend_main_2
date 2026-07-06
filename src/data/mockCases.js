export const caseTypes = [
  'Civil',
  'Criminal',
  'Corporate',
  'Property',
  'Consumer',
  'Labour',
  'Taxation',
  'Other'
];

export const statusTypes = [
  'Open',
  'In Progress',
  'Hearing Scheduled',
  'Adjourned',
  'Closed',
  'Archived'
];

export const priorityTypes = [
  'Low',
  'Medium',
  'High',
  'Urgent'
];

export const mockCases = [
  {
    id: 'case-1',
    caseNumber: 'Crl. Appeal 45/2024',
    caseTitle: 'Ramesh Sharma v. State of Maharashtra',
    caseType: 'Criminal',
    court: 'Bombay High Court',
    client: 'Ramesh Sharma',
    oppositeParty: 'State of Maharashtra',
    filingDate: '2024-01-15',
    nextHearingDate: '2024-07-15',
    status: 'Hearing Scheduled',
    priority: 'High',
    assignedAdvocate: 'Adv. A.K. Singh',
    description: 'Bail application for the appellant. Matter involves complex legal arguments on bail eligibility.'
  },
  {
    id: 'case-2',
    caseNumber: 'WP 123/2024',
    caseTitle: 'Priya Enterprises v. Union of India',
    caseType: 'Corporate',
    court: 'Supreme Court of India',
    client: 'Priya Enterprises',
    oppositeParty: 'Union of India',
    filingDate: '2024-02-20',
    nextHearingDate: '2024-07-22',
    status: 'In Progress',
    priority: 'Urgent',
    assignedAdvocate: 'Adv. R. Verma',
    description: 'Writ petition challenging tax assessment order.'
  },
  {
    id: 'case-3',
    caseNumber: 'CS 789/2023',
    caseTitle: 'Sunita Verma v. Municipal Corporation',
    caseType: 'Civil',
    court: 'Delhi High Court',
    client: 'Sunita Verma',
    oppositeParty: 'Municipal Corporation of Delhi',
    filingDate: '2023-12-05',
    nextHearingDate: null,
    status: 'Closed',
    priority: 'Medium',
    assignedAdvocate: 'Adv. S. Gupta',
    description: 'Property dispute. Case disposed in favor of the petitioner.'
  }
];
