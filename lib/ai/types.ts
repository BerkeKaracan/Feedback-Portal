export type AnalyzeIdeaRequest = {
  title: string;
  description: string;
};

export type AnalyzeIdeaDuplicate = {
  postId: string;
  title: string;
  score: number;
};

export type AnalyzeIdeaResponse = {
  duplicates: AnalyzeIdeaDuplicate[];
  tags: string[];
  summary?: string;
};
