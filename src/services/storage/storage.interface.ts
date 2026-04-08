export interface IStorageService {
  save(key: string, content: Buffer | string): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}
