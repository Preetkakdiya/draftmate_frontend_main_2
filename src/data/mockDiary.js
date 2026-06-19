export const diaryCategories = ['Today', 'This Week', 'Upcoming', 'Completed'];

export const mockDiaryEntries = [
  {
    id: '1',
    caseNumber: 'Crl. Appeal 45/2024',
    caseTitle: 'Ramesh Sharma v. State of Maharashtra',
    court: 'Bombay High Court',
    client: 'Ramesh Sharma',
    oppositeParty: 'State of Maharashtra',
    hearingDate: new Date().toISOString().split('T')[0], // Today
    nextDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    remarks: 'Arguments on bail application',
    status: 'upcoming',
    hearingHistory: [
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: 'First hearing, notice issued',
      },
      {
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: 'Reply filed, adjourned for arguments',
      },
    ],
  },
  {
    id: '2',
    caseNumber: 'LPA 123/2024',
    caseTitle: 'Priya Enterprises v. Union of India',
    court: 'Supreme Court of India',
    client: 'Priya Enterprises',
    oppositeParty: 'Union of India',
    hearingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextDate: null,
    remarks: 'Final hearing',
    status: 'upcoming',
    hearingHistory: [
      {
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: 'Admission hearing, case admitted',
      },
    ],
  },
  {
    id: '3',
    caseNumber: 'WP 789/2023',
    caseTitle: 'Sunita Verma v. Municipal Corporation',
    court: 'Delhi High Court',
    client: 'Sunita Verma',
    oppositeParty: 'Municipal Corporation of Delhi',
    hearingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    remarks: 'Order reserved',
    status: 'completed',
    hearingHistory: [
      {
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: 'Petition filed',
      },
      {
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: 'Interim order granted',
      },
    ],
  },
];
