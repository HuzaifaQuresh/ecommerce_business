interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

declare module "cloudflare:workers" {
  export const env: {
    INBOX?: KVNamespace;
    SUPABASE_URL?: string;
    EMAIL?: {
      send: (message: unknown) => Promise<void>;
    };
    SUPABASE_SERVICE_ROLE_KEY?: string;
  };
}
