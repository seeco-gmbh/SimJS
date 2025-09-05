# SimJS Monitoring and Logging System

The SimJS library includes a comprehensive monitoring and logging system that allows you to track simulation events, processes, resources, and performance metrics in real-time.

## Features

- **Event Monitoring**: Track event scheduling, execution, success, and failure
- **Process Monitoring**: Monitor process lifecycle, yields, and interrupts
- **Resource Monitoring**: Track resource requests, acquisitions, releases, and utilization
- **Performance Monitoring**: Collect performance metrics including memory usage, execution times, and simulation speed
- **Flexible Logging**: Support for different log levels and output formats (TEXT, JSON, CSV)
- **Custom Hooks**: Extensible system for custom monitoring behaviors
- **Export Capabilities**: Export logs and metrics for analysis

## Basic Usage

### Setting Up Monitoring

```typescript
import { Environment, Monitor, MonitoringConfig } from 'simjs';

// Create environment
const env = new Environment();

// Configure monitoring
const config: MonitoringConfig = {
    logLevel: 'INFO',
    enableEventMonitoring: true,
    enableProcessMonitoring: true,
    enableResourceMonitoring: true,
    enablePerformanceMonitoring: true,
    performanceSampleInterval: 1000, // milliseconds
    maxLogEntries: 10000,
    outputFormat: 'TEXT'
};

// Create and start monitor
const monitor = new Monitor(config);
monitor.start();

// Instrument environment for automatic event monitoring
monitor.instrumentEnvironment(env);
```

### Basic Monitoring

```typescript
// Your simulation code here
const process = env.process(function* () {
    yield new Timeout(env, 5);
});

// Manual process monitoring
monitor.logProcessStart(process, env);

// Resource monitoring
const resource = new Resource(env, 2);
monitor.logResourceRequest(resource, 1, env, process);
monitor.logResourceAcquire(resource, 1, env, process);

// Run simulation
env.run(100);

// Get metrics
const metrics = monitor.getMetrics(env);
console.log('Simulation metrics:', metrics);

// Stop monitoring
monitor.stop();
```

## Configuration Options

### MonitoringConfig

```typescript
interface MonitoringConfig {
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    enableEventMonitoring: boolean;
    enableProcessMonitoring: boolean;
    enableResourceMonitoring: boolean;
    enablePerformanceMonitoring: boolean;
    performanceSampleInterval: number; // milliseconds
    maxLogEntries: number;
    outputFormat: 'JSON' | 'TEXT' | 'CSV';
    exportPath?: string;
}
```

### Default Configuration

```typescript
{
    logLevel: 'INFO',
    enableEventMonitoring: true,
    enableProcessMonitoring: true,
    enableResourceMonitoring: true,
    enablePerformanceMonitoring: true,
    performanceSampleInterval: 1000,
    maxLogEntries: 10000,
    outputFormat: 'TEXT'
}
```

## Monitoring Types

### Event Monitoring

Automatically tracks when you use `monitor.instrumentEnvironment(env)`:

- Event scheduling
- Event execution
- Simulation steps
- Errors during execution

Manual event monitoring:

```typescript
monitor.logEventSuccess(event, env);
monitor.logEventFailure(event, env, error);
```

### Process Monitoring

Track process lifecycle:

```typescript
const process = env.process(myGenerator);

monitor.logProcessStart(process, env);
monitor.logProcessYield(process, env, yieldedEvent);
monitor.logProcessComplete(process, env);
monitor.logProcessInterrupt(process, env, cause);
```

### Resource Monitoring

Monitor resource usage:

```typescript
const resource = new Resource(env, capacity);

monitor.logResourceRequest(resource, amount, env, process);
monitor.logResourceAcquire(resource, amount, env, process);
monitor.logResourceRelease(resource, amount, env, process);
```

### Performance Monitoring

Performance metrics are collected automatically when enabled:

```typescript
// Manual performance sampling
monitor.samplePerformance();

// Get current metrics
const metrics = monitor.getCurrentMetrics();

// Get performance summary
const summary = monitor.getPerformanceSummary();
```

## Performance Metrics

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
    heapUsed: number;           // Memory usage in MB
    heapTotal: number;          // Total memory in MB
    eventQueueSize: number;     // Number of queued events
    eventsProcessed: number;    // Total events processed
    averageEventExecutionTime: number; // Average execution time in ms
    simulationSpeed: number;    // Events per second
    cpuUsage?: number;         // CPU usage (Node.js only)
}
```

### Performance Summary

```typescript
const summary = monitor.getPerformanceSummary();
// Returns:
// {
//     totalRuntime: number;
//     totalEventsProcessed: number;
//     averageEventsPerSecond: number;
//     peakMemoryUsage: number;
//     averageMemoryUsage: number;
//     slowestEventTime: number;
//     fastestEventTime: number;
//     medianEventTime: number;
// }
```

## Logging and Export

### Log Levels

- `DEBUG`: Detailed information for debugging
- `INFO`: General information about simulation progress
- `WARN`: Warning messages for potential issues
- `ERROR`: Error messages for failures
- `CRITICAL`: Critical system errors

### Export Formats

#### Text Format

```
[2024-01-15T10:30:00.000Z] [15.230] INFO     Environment  Simulation step completed in 2ms | {"executionTime":2,"simulationTime":15.23}
```

#### JSON Format

```json
{
  "timestamp": 1642248600000,
  "simulationTime": 15.23,
  "level": "INFO",
  "type": "SIMULATION_STEPPED",
  "message": "Simulation step completed in 2ms",
  "component": "Environment",
  "metadata": {
    "executionTime": 2,
    "simulationTime": 15.23
  }
}
```

#### CSV Format

```csv
timestamp,simulationTime,level,type,component,message,metadata
2024-01-15T10:30:00.000Z,15.23,INFO,SIMULATION_STEPPED,Environment,"Simulation step completed in 2ms","{""executionTime"":2}"
```

### Exporting Logs

```typescript
// Export all logs
const logData = monitor.exportLogs();

// Get log statistics
const stats = monitor.getLogStatistics();
console.log('Total entries:', stats.totalEntries);
console.log('Entries by level:', stats.entriesByLevel);
console.log('Entries by type:', stats.entriesByType);
```

## Custom Monitoring Hooks

### Adding Custom Hooks

```typescript
// Real-time alert hook
const alertHook = (entry) => {
    if (entry.level === 'ERROR') {
        console.log(`🚨 ALERT: ${entry.message}`);
        // Send notification, write to file, etc.
    }
};

monitor.addHook(alertHook);
```

### Advanced Hook Examples

```typescript
// Performance tracking hook
const performanceTracker = [];
const perfHook = (entry) => {
    if (entry.type === 'PERFORMANCE_SAMPLE') {
        performanceTracker.push({
            time: entry.simulationTime,
            memory: entry.metrics.heapUsed,
            speed: entry.metrics.simulationSpeed
        });
    }
};

// Resource utilization alerting
const resourceAlertHook = (entry) => {
    if (entry.type === 'RESOURCE_ACQUIRED' && entry.metadata?.utilization > 0.9) {
        console.log(`⚠️ High resource utilization: ${entry.resourceId} at ${entry.metadata.utilization * 100}%`);
    }
};

monitor.addHook(perfHook);
monitor.addHook(resourceAlertHook);

// Remove hooks when done
monitor.removeHook(perfHook);
```

## Resource and Process State Tracking

### Resource States

```typescript
const resourceStates = monitor.getResourceStates();
// Returns ResourceState[]
// {
//     id: string;
//     type: string;
//     capacity: number;
//     currentUsage: number;
//     queueLength: number;
//     utilizationPercent: number;
//     requestsTotal: number;
//     releasesTotal: number;
// }
```

### Process States

```typescript
const processStates = monitor.getProcessStates();
// Returns ProcessState[]
// {
//     id: string;
//     name: string;
//     state: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'INTERRUPTED';
//     startTime: number;
//     lastActivity: number;
//     yieldCount: number;
// }
```

## Integration Patterns

### Periodic Reporting

```typescript
function* reportingProcess() {
    while (true) {
        yield new Timeout(env, 10); // Every 10 time units
        
        monitor.samplePerformance();
        const metrics = monitor.getMetrics(env);
        
        console.log(`Time: ${env.now}, Events: ${metrics.eventsProcessed}`);
        console.log(`Active Processes: ${metrics.activeProcesses}`);
        
        // Check for performance issues
        if (metrics.performanceMetrics.heapUsed > 100) {
            console.log('⚠️ High memory usage detected');
        }
    }
}

env.process(reportingProcess());
```

### Conditional Monitoring

```typescript
// Only monitor during specific simulation phases
if (env.now > 50) {
    monitor.start();
} else {
    monitor.stop();
}

// Monitor only specific resources
if (resource.capacity > 10) {
    monitor.logResourceRequest(resource, amount, env, process);
}
```

### Integration with External Systems

```typescript
// Send metrics to external monitoring system
const externalMonitoringHook = (entry) => {
    if (entry.type === 'PERFORMANCE_SAMPLE') {
        // Send to monitoring service
        // fetch('/api/metrics', {
        //     method: 'POST',
        //     body: JSON.stringify(entry.metrics)
        // });
    }
};

monitor.addHook(externalMonitoringHook);
```

## Best Practices

### Performance Considerations

1. **Log Level Management**: Use appropriate log levels to avoid excessive logging
2. **Hook Efficiency**: Keep custom hooks lightweight to avoid simulation slowdown
3. **Memory Limits**: Set reasonable `maxLogEntries` to manage memory usage
4. **Sampling Interval**: Adjust `performanceSampleInterval` based on simulation duration

### Effective Monitoring

1. **Instrument Early**: Set up monitoring before starting simulation
2. **Use Meaningful IDs**: Process and resource names help with analysis
3. **Export Regularly**: For long simulations, export logs periodically
4. **Monitor Resource Usage**: Track resource utilization to identify bottlenecks
5. **Performance Baselines**: Establish performance baselines for comparison

### Debugging with Monitoring

```typescript
// Enable detailed debugging
const debugMonitor = new Monitor({
    logLevel: 'DEBUG',
    enableEventMonitoring: true,
    enableProcessMonitoring: true,
    enableResourceMonitoring: true,
    outputFormat: 'JSON'
});

// Add debug hook
debugMonitor.addHook((entry) => {
    if (entry.level === 'ERROR' || entry.type.includes('FAILED')) {
        console.log('DEBUG:', JSON.stringify(entry, null, 2));
    }
});
```

## API Reference

### Monitor Class

- `constructor(config?: Partial<MonitoringConfig>)`
- `start(): void`
- `stop(): void`
- `instrumentEnvironment(env: Environment): void`
- `samplePerformance(): void`
- `getMetrics(env: Environment): SimulationMetrics`
- `getResourceStates(): ResourceState[]`
- `getProcessStates(): ProcessState[]`
- `exportLogs(): string`
- `getLogStatistics(): LogStatistics`
- `getPerformanceSummary(): PerformanceSummary`
- `addHook(hook: MonitoringHook): void`
- `removeHook(hook: MonitoringHook): void`
- `reset(): void`

### Logger Class

- `constructor(config: MonitoringConfig)`
- `log(entry: BaseLogEntry): void`
- `getLogEntries(filter?: Partial<BaseLogEntry>): BaseLogEntry[]`
- `exportLogs(): string`
- `getStatistics(): LogStatistics`
- `clear(): void`

### PerformanceMonitor Class

- `constructor(logger: Logger, sampleInterval?: number)`
- `start(): void`
- `stop(): void`
- `recordEventExecution(executionTime: number): void`
- `getCurrentMetrics(): PerformanceMetrics`
- `getPerformanceSummary(): PerformanceSummary`
- `reset(): void`

This monitoring system provides comprehensive insights into your simulation's behavior, performance, and resource utilization, enabling you to build more robust and efficient discrete event simulations. 