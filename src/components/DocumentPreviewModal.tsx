import React, { useEffect, useRef } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { ClinicalDocumentRecord } from '../types/clinical';
import { DOCUMENT_TYPE_LABELS, formatDatePtBr } from '../utils/calculations';

interface DocumentPreviewModalProps {
  doc: ClinicalDocumentRecord | null;
  previewUrl: string | null;
  isObjectUrl: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  doc,
  previewUrl,
  isObjectUrl,
  onClose,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl && isObjectUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, isObjectUrl]);

  if (!doc || !previewUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = doc.fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.focus();
        win.print();
        return;
      }
    } catch {
      // Fallback to download when cross-origin signed URL blocks iframe print
    }
    handleDownload();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-preview-title"
    >
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#0B1F3A] px-5 py-3.5 text-white">
          <div className="min-w-0">
            <h3 id="doc-preview-title" className="font-display text-sm sm:text-base font-bold truncate">
              {doc.title}
            </h3>
            <p className="text-[11px] text-slate-300 truncate">
              {DOCUMENT_TYPE_LABELS[doc.documentType]} · v{doc.version} · {formatDatePtBr(doc.documentDate)} · {doc.professionalName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Fechar visualização"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100">
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title={doc.title}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
