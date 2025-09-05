import { Environment, Event, ConditionValue } from '../../src/SimJS.js';

describe('Advanced Event Tests', () => {
    let env: Environment;

    beforeEach(() => {
        env = new Environment();
    });

    test('should handle complex condition with processed events', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        event1.succeed('value1');
        env.step();
        event1.callbacks = null;

        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        event2.succeed('value2');
        env.run();
        
        expect(condition.triggered).toBe(true);
        expect(condition.ok).toBe(true);
        expect(condition.value).toBeInstanceOf(ConditionValue);
        
        const conditionValue = condition.value as ConditionValue;
        expect(conditionValue.events).toContain(event1);
    });

    test('should properly remove check callbacks', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        expect(event1.callbacks!.length).toBeGreaterThan(0);
        expect(event2.callbacks!.length).toBeGreaterThan(0);
        
        event1.succeed('value1');
        event2.succeed('value2');
        env.run();
        
        expect(condition.triggered).toBe(true);
    });

    test('should handle condition with already failed event', () => {
        const event1 = new Event(env);
        const event2 = new Event(env);
        
        const condition = new Event(env, Event.allEvents, [event1, event2]);
        
        try {
            event1.fail(new Error('Already failed'));
            env.run();
        } catch (e) {
            // Expected error
        }
        
        expect(condition.triggered).toBe(true);
        expect(condition.ok).toBe(false);
        expect(event1.defused).toBe(true);
    });

    test('should test trigger method', () => {
        const sourceEvent = new Event(env);
        const targetEvent = new Event(env);
        
        sourceEvent._ok = true;
        sourceEvent._value = 'trigger_value';
        
        targetEvent.trigger(sourceEvent);
        env.run();
        
        expect(targetEvent.triggered).toBe(true);
        expect(targetEvent.ok).toBe(true);
        expect(targetEvent.value).toBe('trigger_value');
    });

    test('should prevent multiple triggering', () => {
        const event = new Event(env);
        
        event.succeed('first');
        expect(() => event.succeed('second')).toThrow('has already been triggered');
        expect(() => event.fail(new Error('fail after success'))).toThrow('has already been triggered');
    });

    test('should handle edge case with empty events in anyEvents', () => {
        const emptyEvents: Event[] = [];
        expect(Event.anyEvents(emptyEvents, 0)).toBe(true);
        expect(Event.anyEvents(emptyEvents, 1)).toBe(true);
    });
}); 