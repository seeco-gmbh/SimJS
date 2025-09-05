import { Environment, Event } from '../../src/SimJS.js';

describe('Event', () => {
    let env: Environment;
    let event: Event;

    beforeEach(() => {
        env = new Environment();
        event = new Event(env);
    });

    test('should initialize correctly', () => {
        expect(event.triggered).toBe(false);
        expect(event._ok).toBeUndefined();
        expect(event._value).toBe('PENDING');
        expect(Array.isArray(event.callbacks)).toBe(true);
    });

    test('should succeed correctly', () => {
        event.succeed('Success');
        env.run();
        expect(event.triggered).toBe(true);
        expect(event.ok).toBe(true);
        expect(event.value).toBe('Success');
    });

    test('should fail correctly', () => {
        try {
            event.fail(new Error('Failure'));
            env.run();
        } catch (e) {
            // Expected error
        }
        expect(event.triggered).toBe(true);
        expect(event.ok).toBe(false);
        expect(event.value).toBeInstanceOf(Error);
    });

    test('should throw error when accessing ok before triggered', () => {
        expect(() => event.ok).toThrow(`Value of ${event} is not yet available`);
    });

    test('should throw error when accessing value before triggered', () => {
        expect(() => event.value).toThrow(`Value of ${event} is not yet available`);
    });

    test('should chain events with and', () => {
        const otherEvent = new Event(env);
        const condition = event.and(otherEvent);
        expect(condition).toBeInstanceOf(Event);
        expect(condition.env).toBe(env);
    });

    test('should chain events with or', () => {
        const otherEvent = new Event(env);
        const condition = event.or(otherEvent);
        expect(condition).toBeInstanceOf(Event);
        expect(condition.env).toBe(env);
    });

    test('should handle multiple callbacks', () => {
        const results: string[] = [];
        event.callbacks!.push(() => results.push('callback1'));
        event.callbacks!.push(() => results.push('callback2'));

        event.succeed('Test');
        env.run();

        expect(results).toEqual(['callback1', 'callback2']);
    });

    test('should handle defused state', () => {
        expect(event.defused).toBe(false);
        event.defused = true;
        expect(event.defused).toBe(true);
    });

    test('should have correct string representation', () => {
        expect(event.toString()).toBe('<Event() object>');
    });

    test('should test static allEvents method', () => {
        const events = [new Event(env), new Event(env), new Event(env)];
        expect(Event.allEvents(events, 3)).toBe(true);
        expect(Event.allEvents(events, 2)).toBe(false);
        expect(Event.allEvents(events, 4)).toBe(false);
    });

    test('should test static anyEvents method', () => {
        const events = [new Event(env), new Event(env)];
        expect(Event.anyEvents(events, 1)).toBe(true);
        expect(Event.anyEvents(events, 0)).toBe(false);
        expect(Event.anyEvents([], 0)).toBe(true);
    });

    test('should create condition event with evaluate function', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        event1.succeed('value1');
        event2.succeed('value2');
        env.run();
        
        expect(condition.triggered).toBe(true);
        expect(condition.ok).toBe(true);
    });

    test('should fail with mixing environments error', () => {
        const env2 = new Environment();
        const event1 = new Event(env);
        const event2 = new Event(env2);
        
        expect(() => {
            new Event(env, Event.allEvents, [event1, event2]);
        }).toThrow('Mixing events from different environments is not allowed');
    });

    test('should handle condition event triggering', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        event1.succeed('value1');
        event2.succeed('value2');
        env.run();
        
        expect(condition.triggered).toBe(true);
        expect(condition.ok).toBe(true);
    });

    test('should handle condition event with failing event', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        try {
            event1.fail(new Error('Test failure'));
            env.run();
        } catch (e) {
            // Expected error
        }
        
        expect(condition.triggered).toBe(true);
        expect(condition.ok).toBe(false);
        expect(event1.defused).toBe(true);
    });

    test('should describe condition events correctly', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        expect(condition.toString()).toContain('allEvents');
    });
}); 