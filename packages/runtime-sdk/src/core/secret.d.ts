export interface SecretApi {
    get(key: string): Promise<string | null>;
    getRequired(key: string): Promise<string>;
}
export declare const secret: SecretApi;
//# sourceMappingURL=secret.d.ts.map