import { Module, ModuleOptions } from '.';
import { Circuit, Logger } from '../circuit';

type FallbackFunction = (...params: any[]) => any;

// TODO
interface FallbackOptions extends ModuleOptions {
  cb: FallbackFunction;
}

/**
 * TODO
 */
export class Fallback extends Module {
  // Public Attributes
  public cb: FallbackFunction;
  // Constructor
  constructor (options?: FallbackOptions) {
    super(options);
    this.cb = options?.cb || ((err) => err);
  }
  // Public Methods
  public async execute<T> (circuit: Circuit, promise: any, ...params: any[]): Promise<T> {
    this.emit('execute', circuit);
    return this._promiseFallback(circuit, promise, ...params);
  }
  // Private Methods
  private async _promiseFallback<T> (circuit: Circuit, promise: any, ...params: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      promise(...params)
        .then((res: any) => {
          resolve(res);
        })
        .catch((err: Error) => {
          reject(this.cb(err));
        });
    });
  }
}