import { useState } from 'react';

type Props = {
  title: string;
  onTitleChange: (v: string) => void;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
};

export function UploadZone({
  title,
  onTitleChange,
  uploading,
  onUpload,
}: Props) {
  const [drag, setDrag] = useState(false);

  return (
    <section className="card upload-section">
      <div className="card-header">
        <h2 className="card-title">Upload tài liệu</h2>
      </div>

      <div className="upload-field">
        <label htmlFor="doc-title">Tiêu đề (tùy chọn)</label>
        <input
          id="doc-title"
          className="input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="VD: Tài liệu F1, Nội quy công ty…"
        />
      </div>

      <div
        className={`dropzone ${drag || uploading ? 'dragover' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onUpload(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx,.pptx,.xlsx"
          multiple
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files)}
          aria-label="Chọn file tài liệu"
        />
        <div className="dropzone-icon" aria-hidden>
          {uploading ? '⏳' : '📄'}
        </div>
        <p className="dropzone-title">
          {uploading ? 'Đang tải lên…' : 'Kéo thả hoặc chọn file'}
        </p>
        <p className="dropzone-hint">PDF, Word, PowerPoint, Excel</p>
        <div className="file-types">
          {['PDF', 'DOCX', 'PPTX', 'XLSX'].map((t) => (
            <span key={t} className="file-type-chip">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="upload-steps">
        <div className="step-item">
          <span className="step-num">1</span>
          Upload file
        </div>
        <div className="step-item">
          <span className="step-num">2</span>
          Parse (MinerU)
        </div>
        <div className="step-item">
          <span className="step-num">3</span>
          Index (OpenAI)
        </div>
      </div>
    </section>
  );
}
