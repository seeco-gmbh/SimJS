import { jest } from '@jest/globals'; 
import { Environment, Process, Timeout, Initialize, Event } from '../../src/SimJS.js';

describe('Initialize', () => {
    let env: Environment;
    let process: Process;
    let initializeEvent: Initialize;
    let resumeCalled: boolean;

    beforeEach(() => {
        resumeCalled = false;
        env = new Environment();
        
        function* testGenerator(): Generator<Timeout, void, any> {
            yield new Timeout(env, 1); 
        }

        const originalResume = Process.prototype._resume;

        jest.spyOn(Process.prototype, '_resume').mockImplementation(function(event: Event) {
            resumeCalled = true;
            return originalResume.call(this, event);
        });

        process = new Process(env, testGenerator);

    });

    afterEach(() => {
        jest.restoreAllMocks(); 
    });

    test('should trigger process resume on initialization', () => {
        env.step();
        expect(resumeCalled).toBe(true);
    });
}); 