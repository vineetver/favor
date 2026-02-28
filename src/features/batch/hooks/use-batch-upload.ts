"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { presignUpload, uploadFileToS3 } from "../api";

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
 * Hook for handling file upload to S3 via presigned URL
 */
export function useBatchUpload(options: UseBatchUploadOptions = {}): UseBatchUploadResult {
  const { onSuccess, onError } = options;
  const [uploadProgress, setUploadProgress] = useState(0);

  const presignMutation = useMutation({
    mutationFn: presignUpload,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        // Step 1: Get presigned URL
        const { upload_url, input_uri } = await presignMutation.mutateAsync({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
        });

        // Step 2: Upload file to S3
        await uploadFileToS3(upload_url, file, setUploadProgress);

        setIsUploading(false);
        onSuccess?.(input_uri);
        return input_uri;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        setIsUploading(false);
        onError?.(uploadError);
        throw uploadError;
      }
    },
    [presignMutation, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setUploadProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    reset,
  };
}
