import type { IngestedFile, Message } from './mockData';

export async function ingestFilesMock(files: File[]): Promise<IngestedFile[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results: IngestedFile[] = files.map((f, i) => {
        let type: 'pdf' | 'docx' | 'png' | 'mp3' = 'pdf';
        if (f.name.toLowerCase().endsWith('.docx')) type = 'docx';
        if (f.name.toLowerCase().endsWith('.png')) type = 'png';
        if (f.name.toLowerCase().endsWith('.mp3')) type = 'mp3';
        
        return {
          id: `new-file-${Date.now()}-${i}`,
          name: f.name,
          type,
          size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
        };
      });
      resolve(results);
    }, 1200); 
  });
}

export async function queryMock(query: string): Promise<Message> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `m-${Date.now()}`,
        role: 'ai',
        content: `Based on your ingested documents, images, and audio recordings, here is a structured analysis for "${query}":

• Financial Performance: Enterprise software revenue expanded 15% YoY, driven primarily by strong adoption of our predictive analytics suite across enterprise accounts [1].
• Strategic Alignment: Product Roadmap v2 mandates real-time predictive modeling integration across core dashboard modules [2].
• Key Priority & Infrastructure: Leadership explicitly emphasized during the All-Hands call that upgrading backend infrastructure scaling and keeping API latency under 50ms is our #1 technical priority [3].`,
        citations: [
          { id: 'c1', number: 1, fileId: 'f1', snippet: 'Enterprise software revenue saw a robust 15% YoY growth, largely attributed to the successful adoption of our newly released AI analytics suite across top accounts.' },
          { id: 'c2', number: 2, fileId: 'f2', snippet: 'Q1-Q2 Focus: Integration of real-time predictive modeling into the core dashboard to empower data-driven decisions.' },
          { id: 'c3', number: 3, fileId: 'f4', timestamp: '14:22', snippet: '...so as we push these predictive models, upgrading our backend infrastructure scaling is our number one priority for this quarter...' }
        ]
      });
    }, 1200); 
  });
}
