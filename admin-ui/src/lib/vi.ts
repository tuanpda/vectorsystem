/** Nhãn tiếng Việt có dấu — dùng chung toàn Admin UI */

export const DOC_STATUS_LABELS: Record<string, string> = {
  uploaded: 'Đã upload',
  queued_parse: 'Chờ parse',
  parsing: 'Đang parse',
  parsed: 'Đã parse',
  queued_index: 'Chờ index',
  indexing: 'Đang index',
  indexed: 'Sẵn sàng',
  failed: 'Lỗi',
};

export const DOC_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'uploaded', label: DOC_STATUS_LABELS.uploaded },
  { value: 'parsed', label: DOC_STATUS_LABELS.parsed },
  { value: 'indexed', label: DOC_STATUS_LABELS.indexed },
  { value: 'failed', label: DOC_STATUS_LABELS.failed },
  { value: 'parsing', label: DOC_STATUS_LABELS.parsing },
  { value: 'indexing', label: DOC_STATUS_LABELS.indexing },
];

export function parseButtonLabel(status: string): string {
  return status === 'failed' || status === 'parsed' || status === 'indexed'
    ? 'Parse lại'
    : 'Parse';
}

export function indexButtonLabel(status: string): string {
  return status === 'indexed' || status === 'failed' ? 'Index lại' : 'Index';
}

export const vi = {
  nav: {
    dashboard: 'Tổng quan',
    documents: 'Tài liệu',
    testRag: 'Thử RAG',
    apiKeys: 'API Keys',
    users: 'Tài khoản',
    logout: 'Đăng xuất',
    menu: 'Mở menu',
    navAria: 'Điều hướng chính',
  },
  common: {
    loading: 'Đang tải…',
    refresh: 'Làm mới',
    delete: 'Xóa',
    close: 'Đóng',
    copy: 'Sao chép',
    you: '(bạn)',
    apiOffline:
      'Không kết nối được API (cổng 3000). Mở terminal: cd mineru-knowledge-admin && .\\run-api.ps1',
    listLoadError: 'Không tải được danh sách',
    actionFailed: 'Thao tác thất bại',
    uploadFailed: 'Upload thất bại',
    dashboardError: 'Lỗi tải tổng quan',
  },
  documents: {
    libraryTitle: 'Thư viện tài liệu',
    searchPlaceholder: 'Tìm theo tên hoặc file…',
    empty: 'Không có tài liệu phù hợp.',
    colDocument: 'Tài liệu',
    colTitle: 'Tiêu đề',
    colFile: 'File',
    colStatus: 'Trạng thái',
    colChunks: 'Chunks',
    colCost: 'Chi phí Index',
    colActions: 'Thao tác',
    parseAgainTitle: 'Parse lại (MinerU)',
    indexAgainTitle: 'Index lại (embed)',
    noMarkdown: 'Chưa có Markdown',
    confirmDelete: (title: string) => `Xóa "${title}"?`,
    tableScrollHint: 'Cuộn ngang / dọc nếu bảng rộng hoặc nhiều dòng',
  },
  pagination: {
    aria: 'Phân trang danh sách',
    prev: 'Trang trước',
    next: 'Trang sau',
    summaryAll: (total: number) => `${total} tài liệu`,
    summaryRange: (from: number, to: number, total: number) =>
      `Hiển thị ${from}–${to} / ${total} tài liệu`,
    pageOf: (current: number, totalPages: number) =>
      `Trang ${current} / ${totalPages}`,
  },
  dashboard: {
    documents: 'Tài liệu',
    readyForRag: (n: number) => `${n} sẵn sàng RAG (đã index)`,
    chunksHint: 'Đã embed vào vector',
    errors: 'Lỗi',
    errorsHint: 'Cần parse/index lại',
    embedding: 'Embedding',
    systemStatus: 'Trạng thái hệ thống',
    byStatus: 'Tài liệu theo trạng thái',
    manageDocs: 'Quản lý tài liệu',
    mineruOffline: (url: string) =>
      `MinerU offline tại ${url}. Nếu cửa sổ MinerU đang mở mà vẫn offline: đóng cửa sổ đó, chạy lại cd MinerU; .\\run-mineru.ps1 api (lần đầu load model có thể 1–2 phút).`,
    parseHint:
      'Có tài liệu đã parse — vào Tài liệu và bấm Index để RAG dùng được.',
  },
  users: {
    addTitle: 'Thêm tài khoản admin',
    listTitle: 'Tài khoản',
    password: 'Mật khẩu',
    displayNamePlaceholder: 'Tên hiển thị (tùy chọn)',
    creating: 'Đang tạo…',
    create: 'Tạo tài khoản',
    createFailed: 'Tạo tài khoản thất bại',
    deleteFailed: 'Xóa thất bại',
    confirmDelete: (email: string) => `Xóa tài khoản ${email}?`,
    resetPasswordPrompt: (email: string) =>
      `Mật khẩu mới cho ${email} (tối thiểu 6 ký tự):`,
    passwordChanged: 'Đã đổi mật khẩu',
    resetFailed: 'Đổi mật khẩu thất bại',
    changePassword: 'Đổi MK',
  },
  chunks: {
    loadError: 'Không tải được chunks',
    summary: (total: number, shown: number) =>
      `Tổng ${total} chunk (hiện ${shown})`,
    page: (n: number) => `Trang ${n}`,
  },
  usage: {
    title: 'Chi phí OpenAI (ước tính)',
    ollamaNote:
      'Đang dùng Ollama — không theo dõi chi phí OpenAI. Upload/Parse miễn phí (MinerU).',
    monthSpend: 'Tháng này',
    allTime: 'Tổng tích lũy',
    openAiBilling: 'OpenAI (thật)',
    byStep: 'Theo bước pipeline',
    free: 'Miễn phí',
    noCallsYet: 'Chưa có lần Index/RAG nào được ghi nhận',
    topDocsMonth: 'Tài liệu tốn nhất (tháng này)',
    indexCost: 'Index',
  },
  rag: {
    title: 'Thử RAG',
    indexedDocs: (sel: number, total: number) =>
      `Tài liệu đã index (${sel}/${total})`,
    noIndexed:
      'Chưa có tài liệu đã index. Vào Tài liệu → Upload → Parse → Index.',
  },
} as const;

export function formatIndexCost(usd: number | null | undefined): string {
  if (usd == null || usd === 0) return '—';
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
