import { 
    Environment, 
    Process, 
    Resource, 
    Event, 
    Timeout,
    Monitor, 
    Logger,
    PerformanceMonitor,
    MonitoringConfig 
} from '../../src/SimJS.js';

describe('Monitoring System', () => {
    let env: Environment;
    let monitor: Monitor;

    beforeEach(() => {
        env = new Environment();
        monitor = new Monitor({
            logLevel: 'DEBUG',
            enableEventMonitoring: true,
            enableProcessMonitoring: true,
            enableResourceMonitoring: true,
            enablePerformanceMonitoring: true,
            performanceSampleInterval: 100,
            maxLogEntries: 1000,
            outputFormat: 'TEXT'
        });
    });

    afterEach(() => {
        monitor.stop();
    });

    describe('Basic Monitoring Setup', () => {
        test('should create monitor with default config', () => {
            const defaultMonitor = new Monitor();
            expect(defaultMonitor).toBeDefined();
        });

        test('should start and stop monitoring', () => {
            monitor.start();
            expect(monitor.getLogStatistics().totalEntries).toBeGreaterThan(0);
            
            monitor.stop();
            const entriesAfterStop = monitor.getLogStatistics().totalEntries;
            
            // Stop should log a final entry
            expect(entriesAfterStop).toBeGreaterThan(0);
        });
    });

    describe('Event Monitoring', () => {
        test('should log event scheduling', () => {
            monitor.start();
            monitor.instrumentEnvironment(env);

            const event = new Timeout(env, 5);
            env.schedule(event);

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['EVENT_SCHEDULED']).toBeGreaterThanOrEqual(1);
        });

        test('should log simulation steps', () => {
            monitor.start();
            monitor.instrumentEnvironment(env);

            const event = new Timeout(env, 5);
            env.schedule(event);
            env.step();

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['SIMULATION_STEPPED']).toBe(1);
        });

        test('should track event success and failure', () => {
            monitor.start();

            const successEvent = new Event(env);
            const failEvent = new Event(env);

            monitor.logEventSuccess(successEvent, env);
            monitor.logEventFailure(failEvent, env, new Error('Test error'));

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['EVENT_SUCCEEDED']).toBe(1);
            expect(logs.entriesByType['EVENT_FAILED']).toBe(1);
        });
    });

    describe('Process Monitoring', () => {
        test('should track process lifecycle', () => {
            monitor.start();

            const process = env.process(function* () {
                yield new Timeout(env, 1);
                return 'completed';
            });

            monitor.logProcessStart(process, env);
            monitor.logProcessComplete(process, env);

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['PROCESS_STARTED']).toBe(1);
            expect(logs.entriesByType['PROCESS_COMPLETED']).toBe(1);

            const processStates = monitor.getProcessStates();
            expect(processStates.length).toBe(1);
            expect(processStates[0].state).toBe('COMPLETED');
        });

        test('should track process yields', () => {
            monitor.start();

            const process = env.process(function* () {
                yield new Timeout(env, 1);
            });

            const timeout = new Timeout(env, 1);
            monitor.logProcessYield(process, env, timeout);

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['PROCESS_YIELDED']).toBe(1);
        });

        test('should track process interrupts', () => {
            monitor.start();

            const process = env.process(function* () {
                yield new Timeout(env, 10);
            });

            monitor.logProcessStart(process, env);
            monitor.logProcessInterrupt(process, env, 'User interrupt');

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['PROCESS_INTERRUPTED']).toBe(1);
        });
    });

    describe('Resource Monitoring', () => {
        test('should track resource usage', () => {
            monitor.start();

            const resource = new Resource(env, 2);
            const process = env.process(function* () {
                yield new Timeout(env, 1);
            });

            monitor.logResourceRequest(resource, 1, env, process);
            monitor.logResourceAcquire(resource, 1, env, process);
            monitor.logResourceRelease(resource, 1, env, process);

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['RESOURCE_REQUESTED']).toBe(1);
            expect(logs.entriesByType['RESOURCE_ACQUIRED']).toBe(1);
            expect(logs.entriesByType['RESOURCE_RELEASED']).toBe(1);

            const resourceStates = monitor.getResourceStates();
            expect(resourceStates.length).toBe(1);
            expect(resourceStates[0].requestsTotal).toBe(1);
            expect(resourceStates[0].releasesTotal).toBe(1);
        });

        test('should calculate resource utilization', () => {
            monitor.start();

            const resource = new Resource(env, 4);
            // Simulate 2 users acquiring the resource
            resource.users.push(1, 1);

            monitor.logResourceAcquire(resource, 2, env);

            const resourceStates = monitor.getResourceStates();
            expect(resourceStates[0].utilizationPercent).toBe(50); // 2/4 * 100
        });
    });

    describe('Performance Monitoring', () => {
        test('should track performance metrics', () => {
            monitor.start();

            const perfMonitor = new PerformanceMonitor(monitor['logger'], 50);
            perfMonitor.start();

            // Simulate some event executions
            perfMonitor.recordEventExecution(5);
            perfMonitor.recordEventExecution(10);
            perfMonitor.recordEventExecution(3);

            const metrics = perfMonitor.getCurrentMetrics();
            expect(metrics.eventsProcessed).toBe(3);
            expect(metrics.averageEventExecutionTime).toBeCloseTo(6); // (5+10+3)/3

            const summary = perfMonitor.getPerformanceSummary();
            expect(summary.totalEventsProcessed).toBe(3);
            expect(summary.slowestEventTime).toBe(10);
            expect(summary.fastestEventTime).toBe(3);

            perfMonitor.stop();
        });

        test('should handle manual performance sampling', () => {
            monitor.start();

            // Sample performance manually
            monitor.samplePerformance();

            const logs = monitor.getLogStatistics();
            expect(logs.entriesByType['PERFORMANCE_SAMPLE']).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Logging and Export', () => {
        test('should filter logs by level', () => {
            const infoMonitor = new Monitor({
                logLevel: 'INFO',
                maxLogEntries: 100,
                outputFormat: 'TEXT'
            });

            infoMonitor.start();

            // This should be logged (INFO level)
            infoMonitor['logger'].log({
                timestamp: Date.now(),
                simulationTime: 0,
                level: 'INFO',
                type: 'SIMULATION_STARTED',
                message: 'Test info message',
                component: 'Test'
            });

            // This should NOT be logged (DEBUG level)
            infoMonitor['logger'].log({
                timestamp: Date.now(),
                simulationTime: 0,
                level: 'DEBUG',
                type: 'EVENT_SCHEDULED',
                message: 'Test debug message',
                component: 'Test'
            });

            const logs = infoMonitor.getLogStatistics();
            expect(logs.entriesByLevel['INFO']).toBeGreaterThan(0);
            expect(logs.entriesByLevel['DEBUG']).toBeUndefined();

            infoMonitor.stop();
        });

        test('should export logs in different formats', () => {
            monitor.start();
            
            // Add some log entries
            monitor.logEventSuccess(new Event(env), env);

            const textExport = monitor.exportLogs();
            expect(textExport).toContain('Event        Event E1 succeeded');

            // Test JSON export
            const jsonMonitor = new Monitor({
                outputFormat: 'JSON',
                maxLogEntries: 100
            });
            jsonMonitor.start();
            jsonMonitor.logEventSuccess(new Event(env), env);
            
            const jsonExport = jsonMonitor.exportLogs();
            expect(() => JSON.parse(jsonExport)).not.toThrow();

            jsonMonitor.stop();
        });

        test('should provide comprehensive metrics', () => {
            monitor.start();
            monitor.instrumentEnvironment(env);

            // Create some activity
            const resource = new Resource(env, 2);
            const process = env.process(function* () {
                yield new Timeout(env, 1);
            });

            monitor.logProcessStart(process, env);
            monitor.logResourceRequest(resource, 1, env, process);

            const metrics = monitor.getMetrics(env);
            expect(metrics.simulationTime).toBe(env.now);
            expect(metrics.activeProcesses).toBeGreaterThanOrEqual(0);
            expect(metrics.performanceMetrics).toBeDefined();
        });
    });

    describe('Hooks and Extensibility', () => {
        test('should support custom monitoring hooks', () => {
            let hookCallCount = 0;
            const customHook = (entry: any) => {
                hookCallCount++;
            };

            monitor.addHook(customHook);
            monitor.start();

            monitor.logEventSuccess(new Event(env), env);

            expect(hookCallCount).toBeGreaterThan(0);

            monitor.removeHook(customHook);
            const previousCount = hookCallCount;
            
            monitor.logEventSuccess(new Event(env), env);
            expect(hookCallCount).toBe(previousCount);
        });
    });

    describe('Memory Management', () => {
        test('should respect max log entries limit', () => {
            const limitedMonitor = new Monitor({
                maxLogEntries: 5,
                logLevel: 'DEBUG'
            });

            limitedMonitor.start();

            // Add more entries than the limit
            for (let i = 0; i < 10; i++) {
                limitedMonitor.logEventSuccess(new Event(env), env);
            }

            const stats = limitedMonitor.getLogStatistics();
            expect(stats.totalEntries).toBeLessThanOrEqual(5);

            limitedMonitor.stop();
        });
    });
}); 