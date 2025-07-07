'use client';
import React, { ChangeEvent, useRef, useState } from 'react';

interface ImageUploadProps {
  header: string;
  setFilePreview: (filePreview: string | null) => void;
  type: string;
  setFileUrl: (fileUrl: string) => void;
  onFileRead?: (file: File | null, textContent: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  header,
  setFilePreview,
  setFileUrl,
  type,
  onFileRead,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] =
    useState<string>('No file selected');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFilePreview(URL.createObjectURL(file));
      setFileUrl(URL.createObjectURL(file));
      if (onFileRead) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onFileRead(file, e.target?.result as string);
        };
        reader.readAsText(file);
      }
    } else {
      setSelectedFileName('No file selected');
      setFilePreview(null);
      setFileUrl(null);
      if (onFileRead) onFileRead(null, '');
    }
  };

  return (
    <div className="w-full flex flex-col justify-between gap-6">
      <div className="w-full justify-between flex flex-col items-start gap-2">
        <label className="block text-lg font-semibold text-foreground">
          {header}
        </label>
        <input
          type="file"
          accept={type}
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-full h-full flex flex-row justify-between gap-4 items-center">
          <div className="w-full py-3 px-3 bg-background rounded-lg min-h-10 text-foreground border-2 border-border">
            {selectedFileName}
          </div>
          <button
            className="py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg border-2 border-primary transition-colors duration-200"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse...
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
