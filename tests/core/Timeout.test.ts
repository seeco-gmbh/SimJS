import { Environment, Timeout } from '../../src/SimJS.js';

describe('Timeout', () => {
  let env: Environment;
  let timeout: Timeout;

  beforeEach(() => {
    env = new Environment();
    timeout = new Timeout(env, 10, 'TimeoutValue');
  });

  test('should initialize correctly', () => {
    expect((timeout as any)._delay).toBe(10);
    expect(timeout.value).toBe('TimeoutValue');
  });

  test('should trigger after delay', () => {
    env.step();
    expect(env.now).toBe(10);
    expect(timeout.triggered).toBe(true);
    expect(timeout.ok).toBe(true);
    expect(timeout.value).toBe('TimeoutValue');
  });

  test('should throw error for negative delay', () => {
    expect(() => new Timeout(env, -5)).toThrow('Negative delay value: -5');
  });

  test('_desc method', () => {
    const desc = (timeout as any)._desc();
    expect(desc).toBe('Timeout(10, Value=TimeoutValue)');
  });
}); 