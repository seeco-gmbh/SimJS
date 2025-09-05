import { describe, test, expect, beforeEach } from '@jest/globals'; 
import { Environment, Resource } from '../../src/SimJS.js';

describe('Resource', () => {
  let env: Environment;
  let resource: Resource;

  beforeEach(() => {
    env = new Environment();
    resource = new Resource(env, 2); // Capacity of 2
  });

  test('should initialize correctly', () => {
    expect(resource.capacity).toBe(2);
    expect(resource.users.length).toBe(0);
    expect(resource.getQueue.length).toBe(0);
    expect(resource.putQueue.length).toBe(0);
  });

  test('should allocate resource when available', () => {
    const getEvent = resource.get(1);
    env.step(); // Process the getEvent
    expect(getEvent.triggered).toBe(true);
    expect(getEvent.ok).toBe(true);
    expect(resource.users.length).toBe(1);
  });

  test('should not allocate resource when not enough available', () => {
    resource.users = [1, 1]; // All capacity occupied
    const getEvent = resource.get(1);
    expect(getEvent.triggered).toBe(false);
    expect(resource.getQueue.length).toBe(1);
  });

  test('should release resource correctly', () => {
    resource.users = [1, 1]; // Occupy 2
    const putEvent = resource.put(1);
    env.step(); // Process putEvent
    expect(putEvent.triggered).toBe(true);
    expect(putEvent.ok).toBe(true);
    expect(resource.users.length).toBe(1);
  });

  test('should handle multiple get and put requests', () => {
    const get1 = resource.get(1);
    const get2 = resource.get(1);
    const get3 = resource.get(1); // Should wait

    env.step(); // Process get1
    env.step(); // Process get2
    expect(resource.users.length).toBe(2);
    expect(get1.triggered).toBe(true);
    expect(get2.triggered).toBe(true);
    expect(get3.triggered).toBe(false);

    const put1 = resource.put(1);
    env.step(); // Process put1, should trigger get3
    expect(put1.triggered).toBe(true);
    expect(get3.triggered).toBe(true);
    expect(resource.users.length).toBe(2);
  });

  test('should not release more resources than occupied', () => {
    resource.users = [1]; // Only 1 occupied
    const putEvent = resource.put(2);
    expect(putEvent.triggered).toBe(false);
    expect(resource.putQueue.length).toBe(1);
  });

  test('should throw error for zero or negative capacity', () => {
    expect(() => new Resource(env, 0)).toThrow('"capacity" must be > 0.');
    expect(() => new Resource(env, -1)).toThrow('"capacity" must be > 0.');
  });

  test('should use request method as alias for get', () => {
    const requestEvent = resource.request(1);
    const getEvent = resource.get(1);
    
    expect(requestEvent.constructor).toBe(getEvent.constructor);
    expect(requestEvent.amount).toBe(getEvent.amount);
  });
}); 