export interface ExecuteFunctionOptions {
    timeoutMs?: number;
  }
  
  export interface hostfuncApi {
    executeFunction<T = unknown>(
      slug: string,
      input?: unknown,
      options?: ExecuteFunctionOptions,
    ): Promise<T>;
  }
  
  export interface SecretApi {
    get(key: string): Promise<string | null>;
    getRequired(key: string): Promise<string>;
  }
  
  declare const fn: hostfuncApi;
  declare const secret: SecretApi;
  
  export default fn;
  export { secret };