export interface ContentListBlock {
  type: string;
  text?: string;
  text_level?: number;
  page_idx?: number;
  bbox?: number[];
  table_body?: string;
  table_caption?: string[];
  image_caption?: string[];
  image_footnote?: string[];
  text_format?: string;
  list_items?: string[];
}

export interface DraftChunk {
  chunkIndex: number;
  blockType: string;
  content: string;
  pageIdx: number | null;
  headingPath: string | null;
  metadata: Record<string, unknown>;
}
