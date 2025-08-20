import { Loader2, FileText, File } from 'lucide-react';

export interface Attachment {
  name: string;
  url: string;
  contentType?: string;
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;

  const isImage = contentType?.startsWith('image');
  const isVCF = name?.toLowerCase().endsWith('.vcf') || contentType?.includes('vcf');
  const isText = contentType?.startsWith('text') || isVCF;

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center border">
        {isImage ? (
          <img
            key={url}
            src={url}
            alt={name ?? 'An image attachment'}
            className="rounded-md size-full object-cover"
          />
        ) : isVCF ? (
          <div className="flex flex-col items-center justify-center gap-1 text-primary">
            <FileText size={16} />
            <span className="text-[10px] font-medium">VCF</span>
          </div>
        ) : isText ? (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileText size={16} />
            <span className="text-[10px]">TXT</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <File size={16} />
            <span className="text-[10px]">FILE</span>
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-primary"
          >
            <Loader2 size={16} />
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground max-w-16 truncate">{name}</div>
    </div>
  );
};