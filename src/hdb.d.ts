declare module 'hdb' {
  interface ClientOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    [key: string]: unknown;
  }

  interface Client {
    connect(cb: (err: Error | null) => void): void;
    exec<T = unknown>(sql: string, cb: (err: Error | null, rows: T[]) => void): void;
    disconnect(cb?: (err?: Error | null) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
  }

  const hdb: {
    createClient(options: ClientOptions): Client;
  };

  export default hdb;
}
