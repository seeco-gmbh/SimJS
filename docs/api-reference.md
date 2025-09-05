# SimJS API Reference

This document provides a comprehensive reference for all classes, interfaces, and types available in SimJS.

## Table of Contents

- [Core Classes](#core-classes)
  - [Environment](#environment)
  - [Event](#event)
  - [Process](#process)
  - [Timeout](#timeout)
  - [Initialize](#initialize)
- [Resource Management](#resource-management)
  - [Resource](#resource)
  - [BaseResource](#baseresource)
  - [GetResource](#getresource)
  - [PutResource](#putresource)
- [Monitoring System](#monitoring-system)
  - [Monitor](#monitor)
  - [Logger](#logger)
  - [PerformanceMonitor](#performancemonitor)
- [Error Classes](#error-classes)
  - [Interrupt](#interrupt)
  - [StopSimulation](#stopsimulation)
  - [EmptySchedule](#emptyschedule)
- [Types & Interfaces](#types--interfaces)
- [Examples](#examples)

---

## Core Classes

### Environment

The `Environment` class is the heart of the simulation. It manages the simulation time and the event queue.

#### Constructor

```typescript
new Environment(initialTime?: number)
```

**Parameters:**
- `initialTime` (optional): The initial simulation time. Default: `0`

#### Properties

- `now: number` - Current simulation time (read-only)
- `activeProcess: Process | null` - Currently executing process (read-only)

#### Methods

##### `schedule(event: Event, priority?: Priority, delay?: number): void`

Schedules an event to be executed.

**Parameters:**
- `event: Event` - The event to schedule
- `priority?: Priority` - Event priority (`'NORMAL'` or `'URGENT'`). Default: `'NORMAL'`
- `delay?: number` - Delay before execution. Default: `0`

**Example:**
```typescript
const env = new Environment();
const event = new Timeout(env, 5);
env.schedule(event, 'URGENT', 2); // Execute after 2 time units
```

##### `step(): void`

Execute the next event in the queue.

**Throws:**
- `EmptySchedule` - When no events are scheduled

**Example:**
```typescript
env.step(); // Execute one event
```

##### `run(until?: number | Event): void`

Run the simulation until a specified time or event.

**Parameters:**
- `until?: number | Event` - Stop condition (time or event)

**Example:**
```typescript
env.run(100); // Run until time 100
env.run(); // Run until no more events
```

##### `peek(): number`

Get the time of the next scheduled event.

**Returns:** `number` - Time of next event, or `Infinity` if no events

##### `process(generatorFunction: GeneratorFunction): Process`

Create and start a new process.

**Parameters:**
- `generatorFunction: GeneratorFunction` - Generator function defining the process

**Returns:** `Process` - The created process

**Example:**
```typescript
const process = env.process(function* () {
    yield new Timeout(env, 5);
    console.log('Process completed');
});
```

---

### Event

Base class for all simulation events.

#### Constructor

```typescript
new Event(env: Environment, evaluate?: ConditionEvaluator, events?: Event[])
```

**Parameters:**
- `env: Environment` - The simulation environment
- `evaluate?: ConditionEvaluator` - Condition evaluation function
- `events?: Event[]` - Events for condition evaluation

#### Properties

- `env: Environment` - The simulation environment
- `callbacks: EventCallback[] | null` - Event callbacks
- `triggered: boolean` - Whether the event has been triggered (read-only)
- `processed: boolean` - Whether the event has been processed (read-only)
- `ok: boolean` - Whether the event succeeded (read-only)
- `value: any` - Event result value (read-only)
- `defused: boolean` - Whether the event is defused

#### Methods

##### `succeed(value?: any): this`

Mark the event as successful.

**Parameters:**
- `value?: any` - Success value

**Returns:** `this` - For method chaining

##### `fail(exception: Error): this`

Mark the event as failed.

**Parameters:**
- `exception: Error` - Failure reason

**Returns:** `this` - For method chaining

##### `and(other: Event): Event`

Create a condition that waits for both events.

**Parameters:**
- `other: Event` - Other event to wait for

**Returns:** `Event` - Combined condition event

##### `or(other: Event): Event`

Create a condition that waits for either event.

**Parameters:**
- `other: Event` - Other event to wait for

**Returns:** `Event` - Combined condition event

---

### Process

Represents a simulation process based on generator functions.

#### Constructor

```typescript
new Process(env: Environment, generator: GeneratorFunction)
```

**Parameters:**
- `env: Environment` - The simulation environment
- `generator: GeneratorFunction` - Generator function defining the process

#### Properties

- `name: string` - Process name (read-only)
- `isAlive: boolean` - Whether the process is still running (read-only)

#### Methods

##### `interrupt(cause?: any): void`

Interrupt the process.

**Parameters:**
- `cause?: any` - Reason for interruption

---

### Timeout

A simple delay event.

#### Constructor

```typescript
new Timeout(env: Environment, delay: number)
```

**Parameters:**
- `env: Environment` - The simulation environment
- `delay: number` - Delay duration

**Example:**
```typescript
const timeout = new Timeout(env, 10); // Wait 10 time units
yield timeout;
```

---

### Initialize

Event that triggers process initialization.

#### Constructor

```typescript
new Initialize(env: Environment, process: Process)
```

**Parameters:**
- `env: Environment` - The simulation environment
- `process: Process` - Process to initialize

---

## Resource Management

### Resource

Represents a limited resource that processes can request and release.

#### Constructor

```typescript
new Resource(env: Environment, capacity?: number)
```

**Parameters:**
- `env: Environment` - The simulation environment
- `capacity?: number` - Resource capacity. Default: `1`

#### Properties

- `capacity: number` - Resource capacity (read-only)
- `users: number[]` - Current users array (read-only)

#### Methods

##### `request(amount?: number): GetResource`

Request resource units.

**Parameters:**
- `amount?: number` - Number of units to request. Default: `1`

**Returns:** `GetResource` - Request event

**Example:**
```typescript
const resource = new Resource(env, 2);
const request = resource.request(1);
yield request; // Wait for resource
```

##### `release(amount?: number): PutResource`

Release resource units.

**Parameters:**
- `amount?: number` - Number of units to release. Default: `1`

**Returns:** `PutResource` - Release event

**Example:**
```typescript
resource.release(1); // Release 1 unit
```

---

### BaseResource

Abstract base class for all resource types.

#### Constructor

```typescript
new BaseResource(env: Environment, capacity: number)
```

**Parameters:**
- `env: Environment` - The simulation environment
- `capacity: number` - Resource capacity

#### Properties

- `env: Environment` - The simulation environment
- `capacity: number` - Resource capacity

---

### GetResource

Event for requesting resources.

#### Constructor

```typescript
new GetResource(resource: BaseResource, amount: number)
```

**Parameters:**
- `resource: BaseResource` - The resource to request from
- `amount: number` - Amount to request

#### Properties

- `amount: number` - Amount requested

---

### PutResource

Event for releasing resources.

#### Constructor

```typescript
new PutResource(resource: BaseResource, amount: number)
```

**Parameters:**
- `resource: BaseResource` - The resource to release to
- `amount: number` - Amount to release

#### Properties

- `amount: number` - Amount to release

---

## Monitoring System

### Monitor

Main monitoring coordinator that tracks simulation activity.

#### Constructor

```typescript
new Monitor(config?: Partial<MonitoringConfig>)
```

**Parameters:**
- `config?: Partial<MonitoringConfig>` - Monitoring configuration

#### Methods

##### `start(): void`

Start the monitoring system.

##### `stop(): void`

Stop the monitoring system.

##### `instrumentEnvironment(env: Environment): void`

Instrument an environment for automatic monitoring.

**Parameters:**
- `env: Environment` - Environment to instrument

##### `samplePerformance(): void`

Manually trigger a performance sample.

##### `getMetrics(env: Environment): SimulationMetrics`

Get current simulation metrics.

**Parameters:**
- `env: Environment` - Environment to get metrics for

**Returns:** `SimulationMetrics` - Current metrics

##### `addHook(hook: MonitoringHook): void`

Add a custom monitoring hook.

**Parameters:**
- `hook: MonitoringHook` - Hook function

##### `exportLogs(): string`

Export all logs in the configured format.

**Returns:** `string` - Formatted logs

##### `reset(): void`

Reset all monitoring data.

---

### Logger

Handles log entry storage, filtering, and export.

#### Constructor

```typescript
new Logger(config: MonitoringConfig)
```

**Parameters:**
- `config: MonitoringConfig` - Logger configuration

#### Methods

##### `log(entry: BaseLogEntry): void`

Log an entry.

**Parameters:**
- `entry: BaseLogEntry` - Log entry to record

##### `getLogEntries(filter?: Partial<BaseLogEntry>): BaseLogEntry[]`

Get filtered log entries.

**Parameters:**
- `filter?: Partial<BaseLogEntry>` - Optional filter criteria

**Returns:** `BaseLogEntry[]` - Filtered log entries

##### `getStatistics(): LogStatistics`

Get logging statistics.

**Returns:** `LogStatistics` - Statistics about logged entries

---

### PerformanceMonitor

Tracks execution metrics and system performance.

#### Constructor

```typescript
new PerformanceMonitor(logger: Logger, sampleInterval?: number)
```

**Parameters:**
- `logger: Logger` - Logger instance
- `sampleInterval?: number` - Sample interval in milliseconds. Default: `1000`

#### Methods

##### `start(): void`

Start performance monitoring.

##### `stop(): void`

Stop performance monitoring.

##### `getCurrentMetrics(): PerformanceMetrics`

Get current performance metrics.

**Returns:** `PerformanceMetrics` - Current performance data

##### `getPerformanceSummary(): PerformanceSummary`

Get performance summary statistics.

**Returns:** `PerformanceSummary` - Summary statistics

---

## Error Classes

### Interrupt

Exception thrown when a process is interrupted.

#### Constructor

```typescript
new Interrupt(cause?: any)
```

**Parameters:**
- `cause?: any` - Cause of the interruption

---

### StopSimulation

Exception used to stop simulation gracefully.

#### Constructor

```typescript
new StopSimulation(cause?: any)
```

**Parameters:**
- `cause?: any` - Reason for stopping

#### Static Methods

##### `callback(event: Event): void`

Callback function to stop simulation.

**Parameters:**
- `event: Event` - Event that triggered the stop

---

### EmptySchedule

Exception thrown when trying to step with no scheduled events.

#### Constructor

```typescript
new EmptySchedule()
```

---

## Types & Interfaces

### Priority

```typescript
type Priority = 'NORMAL' | 'URGENT';
```

Event scheduling priority levels.

### LogLevel

```typescript
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
```

Logging severity levels.

### MonitoringConfig

```typescript
interface MonitoringConfig {
    logLevel: LogLevel;
    enableEventMonitoring: boolean;
    enableProcessMonitoring: boolean;
    enableResourceMonitoring: boolean;
    enablePerformanceMonitoring: boolean;
    performanceSampleInterval: number;
    maxLogEntries: number;
    outputFormat: 'JSON' | 'TEXT' | 'CSV';
    exportPath?: string;
}
```

Configuration for the monitoring system.

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
    heapUsed: number;
    heapTotal: number;
    eventQueueSize: number;
    eventsProcessed: number;
    averageEventExecutionTime: number;
    simulationSpeed: number;
    cpuUsage?: number;
}
```

Performance metrics data structure.

### SimulationMetrics

```typescript
interface SimulationMetrics {
    simulationTime: number;
    realTime: number;
    eventsProcessed: number;
    activeProcesses: number;
    queuedEvents: number;
    resourceUtilization: Record<string, number>;
    performanceMetrics: PerformanceMetrics;
}
```

Complete simulation metrics.

### ResourceState

```typescript
interface ResourceState {
    id: string;
    type: string;
    capacity: number;
    currentUsage: number;
    queueLength: number;
    utilizationPercent: number;
    requestsTotal: number;
    releasesTotal: number;
}
```

Resource state information.

### ProcessState

```typescript
interface ProcessState {
    id: string;
    name: string;
    state: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'INTERRUPTED';
    startTime: number;
    lastActivity: number;
    yieldCount: number;
}
```

Process state information.

---

## Examples

### Basic Simulation

```typescript
import { Environment, Timeout } from 'simjs';

const env = new Environment();

function* simpleProcess() {
    console.log('Starting at', env.now);
    yield new Timeout(env, 5);
    console.log('Completed at', env.now);
}

env.process(simpleProcess);
env.run();
```

### Resource Usage

```typescript
import { Environment, Resource, Timeout } from 'simjs';

const env = new Environment();
const server = new Resource(env, 2); // 2 servers

function* customer(id: number) {
    console.log(`Customer ${id} arrives at ${env.now}`);
    
    const request = server.request();
    yield request;
    
    console.log(`Customer ${id} starts service at ${env.now}`);
    yield new Timeout(env, 3); // Service time
    
    server.release();
    console.log(`Customer ${id} leaves at ${env.now}`);
}

// Create customers
for (let i = 1; i <= 5; i++) {
    env.process(customer(i));
}

env.run();
```

### Monitoring

```typescript
import { Environment, Monitor, Resource, Timeout } from 'simjs';

const env = new Environment();
const monitor = new Monitor({
    logLevel: 'INFO',
    enableEventMonitoring: true,
    enableResourceMonitoring: true
});

monitor.start();
monitor.instrumentEnvironment(env);

const resource = new Resource(env, 1);

function* process() {
    monitor.logResourceRequest(resource, 1, env);
    const request = resource.request();
    yield request;
    monitor.logResourceAcquire(resource, 1, env);
    
    yield new Timeout(env, 2);
    
    resource.release();
    monitor.logResourceRelease(resource, 1, env);
}

env.process(process);
env.run();

console.log(monitor.exportLogs());
monitor.stop();
```

For more comprehensive examples, see the [examples directory](../examples/) in the repository. 