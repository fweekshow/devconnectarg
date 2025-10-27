import { ICallbackHandler } from "./interfaces";

export class CallbackRegistry {
  static registerHandlers(handlers: ICallbackHandler[]): void {
    for (const handler of handlers) {
      handler.registerCallback();
    }
  }
}
