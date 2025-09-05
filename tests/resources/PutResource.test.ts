// tests/resources/PutResource.test.ts

import { Environment, Resource, PutResource } from '../../src/SimJS.js';

describe('PutResource', () => {
    let env: Environment;
    let resource: Resource;

    beforeEach(() => {
        env = new Environment();
        resource = new Resource(env, 2);
        resource.users = [1, 1]; 
    });

    test('should initialize correctly with valid amount', () => {
        const putEvent = new PutResource(resource, 1);
        expect(putEvent.triggered).toBe(true);
        expect(putEvent.ok).toBe(true);
        expect(resource.users.length).toBe(1);
    });

    test('should not trigger if put amount exceeds occupied', () => {
        const putEvent = new PutResource(resource, 3); 
        expect(putEvent.triggered).toBe(false);
        expect(resource.putQueue.length).toBe(1);
    });

    test('should trigger when enough resources are available', () => {
        resource.users = [1, 1]; 
        const putEvent = new PutResource(resource, 1);
        expect(putEvent.triggered).toBe(true);
        expect(putEvent.ok).toBe(true);
        expect(resource.users.length).toBe(1);
    });

    test('should handle multiple put requests correctly', () => {
        resource.users = [1, 1]; 

        const put1 = new PutResource(resource, 1);
        const put2 = new PutResource(resource, 1); 

        expect(put1.triggered).toBe(true);
        expect(put1.ok).toBe(true);
        expect(resource.users.length).toBe(0); 

        expect(put2.triggered).toBe(true);
        expect(put2.ok).toBe(true);
        expect(resource.users.length).toBe(0); 
    });

    test('should cancel put event correctly', () => {
        resource.users = [1, 1]; 
        const putEvent = new PutResource(resource, 2);
        expect(putEvent.triggered).toBe(true); 
        expect(resource.users.length).toBe(0);
    });

    test('should throw error for invalid amount', () => {
        expect(() => new PutResource(resource, 0)).toThrow('Amount (0) must be > 0.');
        expect(() => new PutResource(resource, -1)).toThrow('Amount (-1) must be > 0.');
    });

    test('should cancel put event when not yet triggered', () => {
        resource.users = [1]; // Only one occupied, can't put 2
        const putEvent = new PutResource(resource, 2);
        expect(putEvent.triggered).toBe(false);
        expect(resource.putQueue.length).toBe(1);

        putEvent.cancel();
        expect(resource.putQueue.length).toBe(0);
        expect(putEvent.triggered).toBe(false);
    });

    test('should not cancel already triggered put event', () => {
        const putEvent = new PutResource(resource, 1);
        expect(putEvent.triggered).toBe(true);

        putEvent.cancel(); // Should do nothing
        expect(putEvent.triggered).toBe(true);
    });
}); 