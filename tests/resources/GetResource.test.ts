import { Environment, Resource, GetResource } from '../../src/SimJS.js';

describe('GetResource', () => {
  let env: Environment;
  let resource: Resource;

  beforeEach(() => {
    env = new Environment();
    resource = new Resource(env, 2); // Capacity of 2
  });

  test('should initialize correctly with valid amount and allocate immediately if possible', () => {
    resource.users = [1]; // One resource unit occupied
    const getEvent = new GetResource(resource, 1);
    expect(getEvent.triggered).toBe(true);
    expect(getEvent.ok).toBe(true);
    expect(resource.users.length).toBe(2);
  });

  test('should not trigger if not enough resources are available', () => {
    resource.users = [1, 1]; // Both resource units occupied
    const getEvent = new GetResource(resource, 1);
    expect(getEvent.triggered).toBe(false);
    expect(resource.getQueue.length).toBe(1);
  });

  test('should trigger when resources become available', () => {
    resource.users = [1, 1]; // Both resource units occupied
    const getEvent = new GetResource(resource, 1);
    expect(getEvent.triggered).toBe(false);
    expect(resource.getQueue.length).toBe(1);

    // Release a resource unit
    resource.users.pop();
    resource._triggerGet();

    expect(getEvent.triggered).toBe(true);
    expect(getEvent.ok).toBe(true);
    expect(resource.users.length).toBe(2);
  });

  test('should handle multiple get requests correctly', () => {
    resource.users = [1]; // One resource unit occupied
    const getEvent1 = new GetResource(resource, 1);
    const getEvent2 = new GetResource(resource, 1);

    expect(getEvent1.triggered).toBe(true);
    expect(getEvent2.triggered).toBe(false);
    expect(resource.users.length).toBe(2);

    // Release a resource unit
    resource.users.pop();
    resource._triggerGet();

    expect(getEvent2.triggered).toBe(true);
    expect(getEvent2.ok).toBe(true);
    expect(resource.users.length).toBe(2)
  });

  test('should cancel get event correctly', () => {
    resource.users = [1, 1]; // Both resource units occupied
    const getEvent = new GetResource(resource, 1); // Should wait
    expect(getEvent.triggered).toBe(false);
    expect(resource.getQueue.length).toBe(1);

    getEvent.cancel();
    expect(resource.getQueue.length).toBe(0);
    expect(getEvent.triggered).toBe(false);
  });

  test('should not cancel already triggered get event', () => {
    const getEvent = new GetResource(resource, 1);
    expect(getEvent.triggered).toBe(true);

    getEvent.cancel(); // Should do nothing
    expect(getEvent.triggered).toBe(true);
  });

  test('should throw error for invalid amount', () => {
    expect(() => new GetResource(resource, 0)).toThrow('Amount (0) must be > 0.');
    expect(() => new GetResource(resource, -1)).toThrow('Amount (-1) must be > 0.');
  });
}); 