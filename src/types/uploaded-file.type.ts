export interface IUploadedFile {
  url: string;
  storageKey: string;
  mimeType: string;
  originalName: string;
  size: number;
  extension: string;
  uploadedAt: Date;
  etag?: string;
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
}
