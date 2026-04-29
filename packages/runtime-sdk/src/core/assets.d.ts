export interface AssetsApi {
    bytes(path: string): Promise<Uint8Array | null>;
    text(path: string): Promise<string | null>;
    url(path: string): string | null;
}
export declare const assets: AssetsApi;
//# sourceMappingURL=assets.d.ts.map