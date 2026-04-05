export interface StorageService {
  generateUploadUrl(
    key: string,
    mimeType: string,
    filename: string,
  ): Promise<{ url: string; contentDisposition: string }>;
  getPublicUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
}
