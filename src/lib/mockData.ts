export type FileType = 'pdf' | 'docx' | 'png' | 'mp3';

export interface IngestedFile {
  id: string;
  name: string;
  type: FileType;
  thumbnailUrl?: string;
  size: string;
}

export const mockFiles: IngestedFile[] = [
  { id: 'f1', name: 'Q3_Earnings_Report.pdf', type: 'pdf', size: '2.4 MB' },
  { id: 'f2', name: 'Product_Roadmap_v2.docx', type: 'docx', size: '1.1 MB' },
  { id: 'f3', name: 'Architecture_Diagram.png', type: 'png', thumbnailUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=200&auto=format&fit=crop', size: '840 KB' },
  { id: 'f4', name: 'All_Hands_Meeting.mp3', type: 'mp3', size: '14.2 MB' },
];

export interface Citation {
  id: string;
  number: number;
  fileId: string;
  snippet?: string;
  timestamp?: string;
  caption?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
}

export const mockConversation: Message[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'What were the key highlights from the Q3 earnings and how do they align with our upcoming product features?'
  },
  {
    id: 'm2',
    role: 'ai',
    content: 'The Q3 earnings report highlighted a 15% increase in enterprise software revenue, driven primarily by our AI analytics suite [1]. This aligns perfectly with the upcoming Product Roadmap v2, which heavily emphasizes introducing real-time predictive modeling [2]. Furthermore, during the All Hands meeting, leadership noted that infrastructure scaling is a top priority to support these features [3].',
    citations: [
      { id: 'c1', number: 1, fileId: 'f1', snippet: 'Enterprise software revenue saw a robust 15% YoY growth, largely attributed to the successful adoption of our newly released AI analytics suite across our top 50 accounts.' },
      { id: 'c2', number: 2, fileId: 'f2', snippet: 'Q1-Q2 Focus: Integration of real-time predictive modeling into the core dashboard to empower data-driven decisions.' },
      { id: 'c3', number: 3, fileId: 'f4', timestamp: '14:22', snippet: '...so as we push these predictive models, upgrading our backend infrastructure scaling is our number one priority for this quarter...' },
    ]
  }
];
