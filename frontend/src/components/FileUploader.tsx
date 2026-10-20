import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  allowedExtensions?: string; // e.g. "pdf,docx,zip"
  maxSizeMb?: number; // e.g. 25
  label?: string;
  helperText?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  allowedExtensions = 'pdf,docx,zip',
  maxSizeMb = 25,
  label = 'Upload File',
  helperText,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedList = allowedExtensions
    .split(',')
    .map((ext) => ext.trim().toLowerCase().replace('.', ''));

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Size check
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size exceeds the limit of ${maxSizeMb}MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    // Extension check
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (allowedList.length > 0 && !allowedList.includes(ext)) {
      setError(`File type .${ext} is not allowed. Supported formats: ${allowedList.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-indigo-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            accept={allowedList.map((ext) => `.${ext}`).join(',')}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse <span className="font-normal text-slate-500">or drag and drop your file</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Formats: <span className="font-medium text-slate-600">{allowedExtensions.toUpperCase()}</span> (Up to{' '}
                {maxSizeMb}MB)
              </p>
            </div>
            {helperText && <p className="text-xs text-slate-500 italic mt-1">{helperText}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{formatSize(selectedFile.size)}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Ready for secure S3 upload
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-3"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-2 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
