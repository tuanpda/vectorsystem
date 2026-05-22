type Props = {
  content: string;
  onClose: () => void;
};

export function MarkdownModal({ content, onClose }: Props) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="md-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 id="md-modal-title" className="modal-title">
            Xem trước Markdown
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <pre className="modal-pre">{content}</pre>
        </div>
      </div>
    </div>
  );
}
