export const eventTypes = [
  { id: 'hearing', name: 'Hearing', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', icon: 'gavel' },
  { id: 'deadline', name: 'Deadline', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: 'schedule' },
  { id: 'meeting', name: 'Meeting', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: 'people' },
  { id: 'reminder', name: 'Reminder', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', icon: 'notifications' },
];

export const mockCalendarEvents = [
  {
    id: 'cal-1',
    title: 'Ramesh Sharma v. State of Maharashtra',
    type: 'hearing',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    notes: 'Arguments on bail application',
  },
  {
    id: 'cal-2',
    title: 'Filing Deadline - Writ Petition',
    type: 'deadline',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '17:00',
    notes: 'Last date to file counter affidavit',
  },
  {
    id: 'cal-3',
    title: 'Client Meeting with Priya Enterprises',
    type: 'meeting',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:00',
    notes: 'Discuss case strategy for Supreme Court matter',
  },
  {
    id: 'cal-4',
    title: 'Reminder: Check e-Courts portal',
    type: 'reminder',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '09:00',
    notes: 'Check for any new orders or notifications',
  },
];
