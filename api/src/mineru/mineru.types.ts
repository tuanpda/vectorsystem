export interface MineruSubmitResponse {
  task_id: string;
  status_url: string;
  result_url: string;
  file_names?: string[];
  queued_ahead?: number;
}

export interface MineruTaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | string;
  error?: string | null;
  message?: string;
}

export interface MineruParseFormOptions {
  backend: string;
  parseMethod: string;
  langList: string[];
  language: string;
}
