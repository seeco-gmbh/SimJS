import { Environment, Timeout, Process, Event } from '../../src/SimJS.js';

describe('Process', () => {
    let env: Environment;

    beforeEach(() => {
        env = new Environment();
    });

    test('should run process to completion', () => {
        function* sampleProcess(): Generator<Timeout, string, any> {
            try {
                yield new Timeout(env, 5);
                return 'Completed';
            } catch (e) {
                return `Interrupted: ${e}`;
            }
        }

        const proc: Process = env.process(sampleProcess);
        env.run();

        expect(proc.triggered).toBe(true);
        expect(proc.ok).toBe(true);
        expect(proc.value).toBe('Completed');
    });

    test('should handle process interruption', () => {
        function* sampleProcess(): Generator<Timeout, string, any> {
            try {
                yield new Timeout(env, 5);
                return 'Not reached';
            } catch (e) {
                return `Interrupted: ${e}`;
            }
        }

        const proc: Process = env.process(sampleProcess);
        proc.interrupt('Manual interruption');
        try {
            env.run();
        }
        catch (e) {
            expect(e).toBe('Interrupt: Manual interruption');
        }

        expect(proc.triggered).toBe(true);
        expect(proc.ok).toBe(false);
    });

    test('should throw error for non-generator function', () => {
        const notAGenerator = function() {
            return 'not a generator';
        } as any;
        
        expect(() => {
            env.process(notAGenerator);
        }).toThrow('is not a generator');
    });

    test('should get process name correctly', () => {
        function* namedProcess(): Generator<Timeout, void, any> {
            yield new Timeout(env, 1);
        }

        const proc = env.process(namedProcess);
        expect(proc.name).toBe('anonymous');
    });

    test('should return anonymous for unnamed process', () => {
        const proc = env.process(function*() {
            yield new Timeout(env, 1);
        });
        
        expect(proc.name).toBe('anonymous');
    });

    test('should check if process is alive', () => {
        function* testProcess(): Generator<Timeout, void, any> {
            yield new Timeout(env, 1);
        }

        const proc = env.process(testProcess);
        expect(proc.isAlive).toBe(true);
        
        env.run();
        expect(proc.isAlive).toBe(false);
    });

    test('should not interrupt already completed process', () => {
        function* fastProcess(): Generator<Timeout, string, any> {
            yield new Timeout(env, 1);
            return 'completed';
        }

        const proc = env.process(fastProcess);
        env.run();
        
        proc.interrupt('should not work');
        expect(proc.value).toBe('completed');
    });

    test('should handle process that yields invalid value', () => {
        function* invalidProcess(): Generator<any, string, any> {
            yield new Timeout(env, 1);
            yield 'invalid_value';
            return 'should not reach here';
        }

        const proc = env.process(invalidProcess);
        
        try {
            env.run();
        } catch (e) {
            // Expected behavior - exception bubbles up
        }
        
        expect(proc.triggered).toBe(true);
        expect(proc.ok).toBe(false);
        expect(proc.value).toBeInstanceOf(Error);
        expect((proc.value as Error).message).toContain('Invalid Yield value');
    });

    test('should handle process exception catching', () => {
        function* exceptionProcess(): Generator<any, string, any> {
            yield new Timeout(env, 1);
            throw new Error('Test exception');
        }

        const proc = env.process(exceptionProcess);
        
        try {
            env.run();
        } catch (e) {
            // Expected behavior - exception bubbles up
        }
        
        expect(proc.triggered).toBe(true);
        expect(proc.ok).toBe(false);
        expect(proc.value).toBeInstanceOf(Error);
    });

    test('should handle process with already processed event', () => {
        function* processedEventProcess(): Generator<any, string, any> {
            const event = new Event(env);
            event.succeed('test value');
            event.callbacks = null;
            
            yield new Timeout(env, 1);
            yield event;
            return 'completed with processed event';
        }

        const proc = env.process(processedEventProcess);
        env.run();
        
        expect(proc.triggered).toBe(true);
        expect(proc.ok).toBe(true);
        expect(proc.value).toBe('completed with processed event');
    });

    test('should test activeProcess lifecycle', () => {
        let activeProcessDuringExecution: any = null;
        
        function* activeTestProcess(): Generator<Timeout, string, any> {
            activeProcessDuringExecution = (env as any).activeProcess;
            yield new Timeout(env, 1);
            return 'active test completed';
        }

        const proc = env.process(activeTestProcess);
        
        expect((env as any).activeProcess).toBeNull();
        
        env.run();
        
        expect(activeProcessDuringExecution).toBe(proc);
        
        expect((env as any).activeProcess).toBeNull();
        
        expect(proc.triggered).toBe(true);
        expect(proc.ok).toBe(true);
    });
}); 