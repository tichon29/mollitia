import * as Mollitia from '../../../src/index';
import { delay } from '../../../src/helpers/time';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

const successAsync = jest.fn().mockImplementation((res: unknown = 'default', delay = 1) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(res);
    }, delay);
  });
});

const failureAsync = jest.fn().mockImplementation((res: unknown = 'default', delay = 1) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(res);
    }, delay);
  });
});

describe('Cache', () => {
  afterEach(() => {
    logger.debug.mockClear();
    logger.info.mockClear();
    logger.warn.mockClear();
    successAsync.mockClear();
    failureAsync.mockClear();
  });
  it('should cache the previous response by reference', async () => {
    const circuit = new Mollitia.Circuit({
      name: 'circuit-cache',
      options: {
        modules: [
          new Mollitia.Cache({
            name: 'module-cache',
            logger,
            ttl: 100
          })
        ]
      }
    });
    await expect(circuit.fn(successAsync).execute()).resolves.toEqual('default');
    await expect(circuit.fn(successAsync).execute()).resolves.toEqual('default');
    expect(logger.debug).toHaveBeenNthCalledWith(1, 'circuit-cache/module-cache - Cache: Hit');
    const objRef = {
      dummy: 'value1',
      dummy2: 'value2'
    };
    const objRef2 = {
      dummy: 'value1',
      dummy2: 'value3'
    };
    await expect(circuit.fn(successAsync).execute(objRef)).resolves.toEqual(objRef);
    objRef.dummy2 = 'value3';
    await expect(circuit.fn(successAsync).execute(objRef)).resolves.toEqual(objRef);
    expect(logger.debug).toHaveBeenNthCalledWith(2, 'circuit-cache/module-cache - Cache: Hit');
    await expect(circuit.fn(successAsync).execute(objRef2)).resolves.toEqual(objRef2);
    expect(logger.debug).not.toHaveBeenNthCalledWith(3, 'circuit-cache/module-cache - Cache: Hit');
    await delay(150);
    await expect(circuit.fn(successAsync).execute()).resolves.toEqual('default');
    expect(logger.debug).not.toHaveBeenNthCalledWith(3, 'circuit-cache/module-cache - Cache: Hit');
    circuit.dispose();
  });
  it('should have a cache interval', async () => {
    let shouldFail = false;
    const requestAsync = jest.fn().mockImplementation((res: unknown = 'default', delay = 1) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) {
            reject(res);
          } else {
            resolve(res);
          }
        }, delay);
      });
    });
    const cache =  new Mollitia.Cache({
      name: 'module-cache',
      logger,
      ttl: 100,
      cacheClearInterval: 1000
    });
    const circuit = new Mollitia.Circuit({
      name: 'circuit-cache',
      options: {
        modules: [
          cache
        ]
      }
    });
    await expect(circuit.fn(requestAsync).execute()).resolves.toEqual('default');
    await expect(circuit.fn(requestAsync).execute()).resolves.toEqual('default');
    expect(logger.debug).toHaveBeenNthCalledWith(1, 'circuit-cache/module-cache - Cache: Hit');
    await delay(150);
    shouldFail = true;
    await expect(circuit.fn(requestAsync).execute()).resolves.toEqual('default');
    expect(logger.debug).toHaveBeenNthCalledWith(2, 'circuit-cache/module-cache - Cache: Hit [Old]');
    await delay(1000);
    expect(logger.debug).toHaveBeenNthCalledWith(3, 'module-cache - Cache: Clear');
    await expect(circuit.fn(requestAsync).execute()).rejects.toEqual('default');
    circuit.dispose();
  });
});
