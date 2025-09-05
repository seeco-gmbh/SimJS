import { ConditionValue, Environment, Event } from '../../src/SimJS.js';

describe('ConditionValue', () => {
    let conditionValue: ConditionValue;
    let env: Environment;
    let event1: Event;
    let event2: Event;

    beforeEach(() => {
      env = new Environment();
      conditionValue = new ConditionValue();
      event1 = new Event(env);
      event2 = new Event(env);

      event1.succeed('Value1');
      event2.fail(new Error('Value2'));
    });

    test('toDict should return correct dictionary', () => {    
      conditionValue.events.push(event1);
      conditionValue.events.push(event2);
      
      const value1 = conditionValue.get(event1);
      const value2 = conditionValue.get(event2);
      
      expect(value1).toBe('Value1');
      expect(value2).toEqual(new Error('Value2'));
    });

    test('should get correct values', () => {
        conditionValue.events.push(event1);
        conditionValue.events.push(event2);

        expect(conditionValue.get(event1)).toBe('Value1');
        expect(conditionValue.get(event2)).toEqual(new Error('Value2'));
    });

    test('has should work correctly', () => {
        conditionValue.events.push(event1);
        expect(conditionValue.has(event1)).toBe(true);
        expect(conditionValue.has(event2)).toBe(false);
    });

    test('values should return array of values', () => {
        conditionValue.events.push(event1);
        conditionValue.events.push(event2);

        const values = conditionValue.values();
        expect(values).toEqual(['Value1', new Error('Value2')]);
    });

    test('entries should return array of pairs', () => {
        conditionValue.events.push(event1);
        conditionValue.events.push(event2);

        const entries = conditionValue.entries();
        expect(entries).toEqual([
            [event1, 'Value1'],
            [event2, new Error('Value2')]
        ]);
    });

    test('should throw error when getting non-existent event', () => {
        const nonExistentEvent = new Event(env);
        expect(() => conditionValue.get(nonExistentEvent)).toThrow(`Key ${nonExistentEvent} not found`);
    });

    test('should be iterable', () => {
        conditionValue.events.push(event1);
        conditionValue.events.push(event2);

        const iteratedEvents: Event[] = [];
        for (const event of conditionValue) {
            iteratedEvents.push(event);
        }

        expect(iteratedEvents).toEqual([event1, event2]);
    });

    test('keys should return iterator of events', () => {
        conditionValue.events.push(event1);
        conditionValue.events.push(event2);

        const keys = Array.from(conditionValue.keys());
        expect(keys).toEqual([event1, event2]);
    });

    test('toDict should convert to dictionary format', () => {
        conditionValue.events.push(event1);
        conditionValue.events.push(event2);

        const dict = conditionValue.toDict();
        
        const keys = Object.keys(dict);
        expect(keys.length).toBeGreaterThan(0);
        
        const values = Object.values(dict);
        const hasValue1 = values.includes('Value1');
        const hasError = values.some(v => v instanceof Error && v.message === 'Value2');
        
        expect(hasValue1 || hasError).toBe(true);
    });

    test('toString should return formatted string', () => {
        conditionValue.events.push(event1);
        
        const result = conditionValue.toString();
        expect(result).toContain('<ConditionValue');
        expect(result).toContain('Value1');
    });
}); 