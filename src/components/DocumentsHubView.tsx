import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { SPECIALTIES_BY_ID } from '../data/specialties';
import {
  ClinicalDocumentRecord,
  ClinicalDocumentType,
  PatientRecord,
} from '../types/clinical';
import { DOCUMENT_TYPE_LABELS, formatDatePtBr } from '../utils/calculations';

interface DocumentsHubViewProps {
  documents: ClinicalDocumentRecord[];
  patients: PatientRecord[];
  onPreviewDocument: (doc: ClinicalDocumentRecord) => void;
  onDownloadDocument: (doc: ClinicalDocumentRecord) => void;
  onPrintDocument: (doc: ClinicalDocumentRecord) => void;
  onRequestDeleteDocument: (doc: ClinicalDocumentRecord) => void;
  onOpenPatientRecord: (patientId: string) => void;
  onBackToDashboard: () => void;
}

export const DocumentsHubView: React.FC<DocumentsHubViewProps> = ({
  documents,
  patients,
  onPreviewDocument,
  onDownloadDocument,
  onPrintDocument,
  onRequestDeleteDocument,
  onOpenPatientRecord,
  onBackToDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | ClinicalDocumentType>('todos');
  const [patientFilter, setPatientFilter] = useState<string>('todos');

  const patientsMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      const p = patientsMap.get(doc.patientId);
      const matchesType = typeFilter === 'todos' || doc.documentType === typeFilter;
      const matchesPatient = patientFilter === 'todos' || doc.patientId === patientFilter;
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        (p?.fullName.toLowerCase().includes(q) ?? false);
      return matchesType && matchesPatient && matchesSearch;
    });
  }, [documents, patientsMap, typeFilter, patientFilter, searchQuery]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Painel Inicial</span>
          </button>
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-[#1D4ED8]" />
            <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
              Central de Documentos e PDFs Clínicos
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Todos os PDFs emitidos ficam arquivados automaticamente e vinculados ao ID único do paciente correspondente.
          </p>
        </div>

        <div className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
          {documents.length} {documents.length === 1 ? 'documento arquivado' : 'documentos arquivados'}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar título, arquivo ou paciente..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-xs text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
          />
        </div>

        <select
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
        >
          <option value="todos">Todos os pacientes</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'todos' | ClinicalDocumentType)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
        >
          <option value="todos">Todos os tipos de documento</option>
          {(Object.keys(DOCUMENT_TYPE_LABELS) as ClinicalDocumentType[]).map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-1">
          <p className="text-sm font-semibold text-slate-700">
            Nenhum documento clínico encontrado.
          </p>
          <p className="text-xs text-slate-500">
            Ao gerar qualquer PDF vinculado a um paciente cadastrado, o arquivo será arquivado e listado aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Tipo / Versão</th>
                  <th className="px-4 py-3">Data / Profissional</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const patient = patientsMap.get(doc.patientId);
                  const specName = doc.specialtyId ? SPECIALTIES_BY_ID[doc.specialtyId]?.name : null;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0B1F3A]">{doc.title}</div>
                        <div className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                          {doc.fileName} · {formatBytes(doc.fileSizeBytes)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {patient ? (
                          <button
                            type="button"
                            onClick={() => onOpenPatientRecord(patient.id)}
                            className="font-semibold text-[#1D4ED8] hover:underline text-left"
                          >
                            {patient.fullName}
                          </button>
                        ) : (
                          <span className="text-slate-400">Paciente removido</span>
                        )}
                        {specName && <div className="text-[11px] text-slate-500">{specName}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {DOCUMENT_TYPE_LABELS[doc.documentType]}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">Versão v{doc.version}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-mono tabular-nums">{formatDatePtBr(doc.documentDate)}</div>
                        <div className="text-[11px] text-slate-500">
                          {doc.professionalName} · {doc.professionalCrefito}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewDocument(doc)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Abrir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDownloadDocument(doc)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
                            title="Baixar PDF"
                            aria-label="Baixar PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintDocument(doc)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
                            title="Imprimir PDF"
                            aria-label="Imprimir PDF"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteDocument(doc)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Excluir documento"
                            aria-label="Excluir documento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
