"use client";

import { useCallback, useState } from "react";
import { uploadFile } from "../api";

interface UseBatchUploadOptions {
  onSuccess?: (inputUri: string) => void;
  onError?: (error: Error) => void;
}

interface UseBatchUploadResult {
  uploadFile: (file: File) => Promise<string>;
  uploadProgress: number;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for uploading a file via POST /cohorts/upload (single request).
 */
export function useBatchUpload(
  options: UseBatchUploadOptions = {},
): UseBatchUploadResult {
  const { onSuccess, onError } = options;
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string> => {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        const { input_uri } = await uploadFile(file, setUploadProgress);

        setIsUploading(false);
        onSuccess?.(input_uri);
        return input_uri;
      } catch (err) {
        const uploadError =
          err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        setIsUploading(false);
        onError?.(uploadError);
        throw uploadError;
      }
    },
    [onSuccess, onError],
  );

  const reset = useCallback(() => {
    setUploadProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);

  return {
    uploadFile: upload,
    uploadProgress,
    isUploading,
    error,
    reset,
  };
}
