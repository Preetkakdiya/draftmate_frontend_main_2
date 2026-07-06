import { mockHearings } from '../../data/mockHearings';
import { mockDiaryEntries } from '../../data/mockDiary';

// Mock responses for e-Courts and Surepass APIs
const mockCaseData = {
  cnrNumber: 'DL2501000000012024',
  caseNumber: 'Crl. Appeal 45/2024',
  caseTitle: 'Ramesh Sharma v. State of Maharashtra',
  caseType: 'Criminal',
  court: 'Bombay High Court',
  courtEstablishment: 'Bombay High Court, Principal Bench',
  petitioner: 'Ramesh Sharma',
  respondent: 'State of Maharashtra',
  caseStage: 'Argument on Admission',
  status: 'Pending',
  nextHearingDate: '2024-07-15',
  nextHearingTime: '10:00',
  lastUpdated: '2024-06-22',
  latestOrder: {
    date: '2024-06-20',
    title: 'Notice issued to respondent',
    description: 'Court issued notice to the respondent to appear on next date of hearing'
  },
  latestProceeding: 'Arguments heard, order reserved',
  judge: 'Hon. Justice A.K. Desai',
  filingDate: '2024-01-15',
  registrationDate: '2024-01-20'
};

const mockOrders = [
  { id: 'order-1', date: '2024-06-20', title: 'Notice issued to respondent', type: 'Notice' },
  { id: 'order-2', date: '2024-05-15', title: 'Case registered', type: 'Registration' },
  { id: 'order-3', date: '2024-04-10', title: 'Petition admitted', type: 'Admission' }
];

const mockHearingsFromECourts = [
  { id: 'h-1', date: '2024-07-15', time: '10:00', court: 'Bombay High Court', judge: 'Hon. Justice A.K. Desai', status: 'Scheduled' },
  { id: 'h-2', date: '2024-06-20', time: '14:30', court: 'Bombay High Court', judge: 'Hon. Justice A.K. Desai', status: 'Completed' },
  { id: 'h-3', date: '2024-05-15', time: '11:00', court: 'Bombay High Court', judge: 'Hon. Justice A.K. Desai', status: 'Adjourned' }
];

export const ecourtsService = {
  async searchByCNR(cnrNumber) {
    await new Promise(r => setTimeout(r, 1000));
    return {
      ...mockCaseData,
      cnrNumber: cnrNumber || mockCaseData.cnrNumber
    };
  },

  async fetchCaseStatus(cnrNumber) {
    await new Promise(r => setTimeout(r, 800));
    return {
      ...mockCaseData,
      cnrNumber: cnrNumber || mockCaseData.cnrNumber
    };
  },

  async fetchOrders(cnrNumber) {
    await new Promise(r => setTimeout(r, 1200));
    return mockOrders;
  },

  async fetchHearings(cnrNumber) {
    await new Promise(r => setTimeout(r, 900));
    return mockHearingsFromECourts;
  }
};
