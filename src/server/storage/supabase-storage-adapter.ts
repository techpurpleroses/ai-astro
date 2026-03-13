import type { BucketClient, StorageClient, UploadOptions } from "./contracts";

interface SupabaseLikeStorageBucket {
  upload: (
    path: string,
    body: ArrayBuffer | Uint8Array,
    options?: { contentType?: string; upsert?: boolean }
  ) => Promise<{ error: { message: string } | null }>;
  createSignedUrl: (
    path: string,
    expiresIn: number
  ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
  remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
}

interface SupabaseLikeClient {
  storage: {
    from: (bucket: string) => SupabaseLikeStorageBucket;
  };
}

class SupabaseBucketAdapter implements BucketClient {
  constructor(private readonly bucket: SupabaseLikeStorageBucket) {}

  async upload(path: string, body: ArrayBuffer | Uint8Array, options?: UploadOptions): Promise<void> {
    const { error } = await this.bucket.upload(path, body, {
      contentType: options?.contentType,
      upsert: options?.upsert,
    });
    if (error) throw new Error(error.message);
  }

  async createSignedUrl(path: string, options: { expiresInSeconds: number }): Promise<string> {
    const { data, error } = await this.bucket.createSignedUrl(path, options.expiresInSeconds);
    if (error) throw new Error(error.message);
    if (!data?.signedUrl) throw new Error("Failed to create signed URL.");
    return data.signedUrl;
  }

  async remove(paths: string[]): Promise<void> {
    const { error } = await this.bucket.remove(paths);
    if (error) throw new Error(error.message);
  }
}

export function asStorageClient(supabase: SupabaseLikeClient): StorageClient {
  return {
    from(bucket: string): BucketClient {
      return new SupabaseBucketAdapter(supabase.storage.from(bucket));
    },
  };
}

