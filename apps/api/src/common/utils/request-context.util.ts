import { AsyncLocalStorage } from 'async_hooks';

import { CurrentPrincipal } from '../interfaces/current-principal.interface';
import { RequestContext } from '../interfaces/request-context.interface';

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export class RequestContextStorage {
  static run<T>(context: RequestContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  static get(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  static getRequestId(): string | undefined {
    return this.get()?.requestId;
  }

  static getPrincipal(): CurrentPrincipal | undefined {
    return this.get()?.request.principal ?? this.get()?.request.user;
  }
}
