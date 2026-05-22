export const DOCUMENT_PARSE_QUEUE = 'document-parse';

export interface DocumentParseJobPayload {
  documentId: string;
  parseJobId: string;
}
