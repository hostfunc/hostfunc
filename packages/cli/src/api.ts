import { HostfuncApiClient } from "@hostfunc/api-client";

/**
 * Thin CLI adapter over the shared {@link HostfuncApiClient}. Preserves the historical
 * `new CliApi(baseUrl, token)` positional constructor used throughout `bin.ts` and the contract
 * tests, while the actual transport + typed surface lives in `@hostfunc/api-client`.
 */
export class CliApi extends HostfuncApiClient {
  constructor(baseUrl: string, token: string) {
    super({ baseUrl, getToken: () => token });
  }
}
