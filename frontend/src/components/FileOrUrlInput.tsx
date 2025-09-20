import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileOrUrlInputProps {
  file: File | null;
  url: string;
  onFileChange: (f: File | null) => void;
  onUrlChange: (u: string) => void;
  accept?: string;
  placeholder?: string;
  error?: string;
}

export default function FileOrUrlInput({
  file,
  url,
  onFileChange,
  onUrlChange,
  accept = '.yml,.yaml',
  placeholder = 'Enter direct URL to .yml or .yaml pricing file',
  error,
}: FileOrUrlInputProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File | null) => {
    if (selected && !new RegExp(`(${accept.replace(/\./g, '\\.')})$`, 'i').test(selected.name)) {
      onFileChange(null);
      return;
    }
    onFileChange(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] || null);
    if (e.target.files) e.currentTarget.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence>
        <motion.div
          className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
            dragActive ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/40' : 'border-indigo-200 dark:border-gray-600 bg-indigo-100/60 dark:bg-gray-800/60'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDrag}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          style={{ minHeight: 120 }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center py-6">
            <svg
              className="w-10 h-10 text-indigo-400 dark:text-indigo-300 mb-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-4 4m4-4l4 4m-8 8h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-indigo-700 dark:text-indigo-200 font-medium">Drag & drop your .yml or .yaml file here</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">or click to select a file</span>
            {file && <span className="mt-2 text-indigo-600 dark:text-indigo-200 text-sm font-semibold">{file.name}</span>}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-3">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Or provide URL</label>
        <input
          type="url"
          placeholder={placeholder}
          value={url}
          onChange={e => onUrlChange(e.target.value)}
          className="w-full rounded px-3 py-2 border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm"
        />
        {error && <div className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</div>}
      </div>
    </div>
  );
}
