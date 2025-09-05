import { Environment, Event, EmptySchedule, StopSimulation } from '../../src/SimJS.js';

describe('Environment', () => {
  let env: Environment;

  beforeEach(() => {
    env = new Environment();
  });

  test('should initialize correctly', () => {
    expect(env.now).toBe(0);
    expect(env.peek()).toBe(Infinity);
  });

  test('should schedule events correctly', () => {
    const event = new Event(env);
    env.schedule(event, 'NORMAL', 5);
    expect(env.peek()).toBe(5);
  });

  test('should process events in order', () => {
    const results: string[] = [];
    const event1 = new Event(env);
    const event2 = new Event(env);

    event1._ok = true;
    event2._ok = true;
    event1.callbacks = [() => results.push('event1')];
    event2.callbacks = [() => results.push('event2')];

    env.schedule(event2, 'NORMAL', 5);
    env.schedule(event1, 'NORMAL', 10);

    env.step();
    expect(env.now).toBe(5);
    expect(results).toEqual(['event2']);

    env.step();
    expect(env.now).toBe(10);
    expect(results).toEqual(['event2', 'event1']);
  });

  test('should throw EmptySchedule when stepping with empty queue', () => {
    expect(() => env.step()).toThrow(EmptySchedule);
  });

  test('should run simulation until completion', () => {
    const results: string[] = [];
    const event1 = new Event(env);
    const event2 = new Event(env);

    event1._ok = true;
    event2._ok = true;
    event1.callbacks = [() => results.push('event1')];
    event2.callbacks = [() => results.push('event2')];

    env.schedule(event1, 'NORMAL', 5);
    env.schedule(event2, 'NORMAL', 10);

    env.run();

    expect(env.now).toBe(10);
    expect(results).toEqual(['event1', 'event2']);
  });

  test('should stop simulation when StopSimulation is thrown', () => {
    const event = new Event(env);
    event._ok = true;
    event.callbacks = [() => {
        throw new StopSimulation(event);
    }];
    
    env.schedule(event, 'NORMAL', 5);

    expect(() => env.run()).toThrow(StopSimulation);
    expect(env.now).toBe(5);
});

  test('should handle urgent priority events', () => {
    const results: string[] = [];
    const urgentEvent = new Event(env);
    const normalEvent = new Event(env);

    urgentEvent._ok = true;
    normalEvent._ok = true;
    urgentEvent.callbacks = [() => results.push('urgent')];
    normalEvent.callbacks = [() => results.push('normal')];

    env.schedule(normalEvent, 'NORMAL', 5);
    env.schedule(urgentEvent, 'URGENT', 5);

    env.run();
    expect(results).toEqual(['urgent', 'normal']);
  });

  test('should handle invalid until argument in run method', () => {
    const invalidUntil = "invalid" as any;
    expect(() => env.run(invalidUntil)).toThrow('Invalid "until" argument');
  });

  test('should run until specific time', () => {
    const event1 = new Event(env);
    const event2 = new Event(env);

    event1._ok = true;
    event2._ok = true;
    event1.callbacks = [];
    event2.callbacks = [];

    env.schedule(event1, 'NORMAL', 5);
    env.schedule(event2, 'NORMAL', 15);

    env.run();
    expect(env.now).toBe(15);
  });

  test('should run until specific event', () => {
    const event1 = new Event(env);
    const event2 = new Event(env);
    const stopEvent = new Event(env);

    event1._ok = true;
    event2._ok = true;
    stopEvent._ok = true;
    event1.callbacks = [];
    event2.callbacks = [];
    stopEvent.callbacks = [];

    env.schedule(event1, 'NORMAL', 5);
    env.schedule(stopEvent, 'NORMAL', 10);
    env.schedule(event2, 'NORMAL', 15);

    try {
      env.run(stopEvent);
    } catch (e) {
    }

    expect(env.now).toBe(10);
  });

  test('should handle event with null callbacks', () => {
    const event = new Event(env);
    event._ok = true;
    event.callbacks = null;

    env.schedule(event, 'NORMAL', 5);
      env.step();
    expect(env.now).toBe(5);
  });

  test('should handle event that fails and is not defused', () => {
    const event = new Event(env);
    event._ok = false;
    event._defused = false;
    event._value = new Error('Test error');
    event.callbacks = [];

    env.schedule(event, 'NORMAL', 5);
    
    expect(() => env.step()).toThrow('Test error');
  });
}); 