export interface UploadOptions {
  contentType?: string;
  upsert?: boolean;
}

export interface SignedUrlOptions {
  expiresInSeconds: number;
}

export interface BucketClient {
  upload(path: string, body: ArrayBuffer | Uint8Array, options?: UploadOptions): Promise<void>;
  createSignedUrl(path: string, options: SignedUrlOptions): Promise<string>;
  remove(paths: string[]): Promise<void>;
}

export interface StorageClient {
  from(bucket: string): BucketClient;
}

