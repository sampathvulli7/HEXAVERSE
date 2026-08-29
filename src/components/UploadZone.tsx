import React, { useState, useCallback } from 'react';
import { UploadCloud, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ingestFilesMock } from '../lib/api';
import type { IngestedFile } from '../lib/mockData';

interface UploadZoneProps {
  onUploadSuccess: (files: IngestedFile[]) => void;
}

const UPLOAD_STEPS = ["Extracting", "Embedding", "Indexing", "Done"];

export function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleUpload(files);
    }
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await handleUpload(files);
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploadStep(0);
    
    const stepInterval = setInterval(() => {
      setUploadStep(prev => (prev !== null && prev < 3) ? prev + 1 : prev);
    }, 600);

    try {
      const result = await ingestFilesMock(files);
      
      clearInterval(stepInterval);
      setUploadStep(3);
      
      setTimeout(() => {
        onUploadSuccess(result);
        setUploadStep(null);
      }, 800);
      
    } catch (error) {
      clearInterval(stepInterval);
      console.error(error);
      setUploadStep(null);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-48 p-8 mx-auto",
        "bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-sm transition-all duration-200",
        isDragging ? "border-blue-400 bg-blue-50/50 scale-[1.02]" : "hover:border-gray-300 hover:shadow-md"
      )}
    >
      <input 
        type="file" 
        multiple 
        onChange={handleChange} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept=".pdf,.docx,.png,.mp3"
        disabled={uploadStep !== null}
      />
      
      {uploadStep !== null ? (
        <div className="flex flex-col items-center w-full max-w-sm z-0">
          <div className="flex items-center justify-between w-full mb-2 relative">
            <div className="absolute left-4 right-4 h-0.5 bg-gray-100 dark:bg-zinc-800 top-2.5 -z-10" />
            {UPLOAD_STEPS.map((step, idx) => (
              <div key={step} className="flex flex-col items-center bg-white dark:bg-zinc-900 px-2">
                {uploadStep > idx ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 bg-white dark:bg-zinc-900" />
                ) : uploadStep === idx ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin bg-white dark:bg-zinc-900" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-200 bg-white dark:bg-zinc-900" />
                )}
                <span className={cn("text-[10px] mt-1.5 font-medium uppercase tracking-wider", uploadStep >= idx ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500")}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-gray-500 dark:text-gray-400 dark:text-gray-500 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 text-blue-500">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
            Drag & drop files to ingest
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Supports PDF, DOCX, PNG, MP3
          </p>
        </div>
      )}
    </div>
  );
}
