import { Environment, StopSimulation, Event } from '../../src/SimJS.js';

describe('StopSimulation', () => {
  let env: Environment;
  let event: Event;

  beforeEach(() => {
    env = new Environment();
    event = new Event(env);
  });

  test('should create StopSimulation with event', () => {
    const stopSim = new StopSimulation(event);
    expect(stopSim.message).toBe('StopSimulation');
    expect(stopSim.event).toBe(event);
    expect(stopSim.name).toBe('StopSimulation');
  });

  test('callback should throw StopSimulation when event is ok', () => {
    const stopSim = new StopSimulation(event);
    event.succeed('Simulation ended');
    expect(() => StopSimulation.callback(event)).toThrow(stopSim);
  });

  test('callback should throw event value when event fails', () => {
    const error = new Error('Event failed');
    event.fail(error);
    expect(() => StopSimulation.callback(event)).toThrow(error);
  });

  test('toString should return formatted string', () => {
    const stopSim = new StopSimulation('test_event');
    expect(stopSim.toString()).toBe('StopSimulation(test_event)');
  });
}); 