import { Environment, Timeout, Resource } from '../src/SimJS.js';

describe('Performance Tests', () => {
  test('should handle a large number of events efficiently', () => {
    const env = new Environment();
    const numEvents = 10000;
    const startTime = performance.now();

    for (let i = 0; i < numEvents; i++) {
      env.schedule(new Timeout(env, i % 100, `Event ${i}`));
    }

    env.run();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Processed ${numEvents} events in ${duration.toFixed(2)} ms`);

    // Arbitrary performance expectation: less than 2000 ms
    expect(duration).toBeLessThan(2000);
  });

  test('should manage resources efficiently', () => {
    const env = new Environment();
    const resource = new Resource(env, 100);
    const numProcesses = 50000;
    const startTime = performance.now();

    function* worker(): Generator<any, void, any> {
      yield resource.get(1);
      yield new Timeout(env, 10);
      yield resource.release(1);
    }

    for (let i = 0; i < numProcesses; i++) {
      env.process(worker);
    }

    env.run();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Managed ${numProcesses} processes in ${duration.toFixed(2)} ms`);

    expect(duration).toBeLessThan(2000);
  });
}); 