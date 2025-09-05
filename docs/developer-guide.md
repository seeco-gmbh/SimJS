# SimJS Developer Guide

This guide provides comprehensive information for developers who want to understand, extend, or contribute to SimJS.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Building and Testing](#building-and-testing)
- [Core Concepts](#core-concepts)
- [Extending SimJS](#extending-simjs)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Architecture Overview

SimJS follows an event-driven architecture inspired by SimPy, built with TypeScript for type safety and modern JavaScript compatibility.

### Key Components

```
SimJS Architecture
├── Core Engine
│   ├── Environment (Simulation coordinator)
│   ├── Event System (Priority-based event queue)
│   └── Process Management (Generator-based processes)
├── Resource Management
│   ├── Resource (Limited capacity resources)
│   └── Resource Events (Get/Put operations)
├── Monitoring System
│   ├── Logger (Event logging and filtering)
│   ├── PerformanceMonitor (System metrics)
│   └── Monitor (Main coordinator)
└── Error Handling
    ├── Interrupt (Process interruption)
    ├── StopSimulation (Graceful termination)
    └── EmptySchedule (Queue exhaustion)
```

### Design Principles

1. **Discrete Event Simulation**: Time advances in discrete steps driven by events
2. **Generator-based Processes**: Use JavaScript generators for coroutine-like behavior
3. **Type Safety**: Full TypeScript support with comprehensive type definitions
4. **Modular Design**: Clean separation of concerns between components
5. **Extensibility**: Plugin-friendly architecture for custom components

---

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- TypeScript >= 5.0.0
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd simjs

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Commands

```bash
# Development build with watch mode
npm run build:watch

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

---

## Project Structure

```
simjs/
├── src/                          # Source code
│   ├── core/                     # Core simulation engine
│   │   ├── Environment.ts        # Main simulation environment
│   │   ├── Heap.ts              # Priority queue implementation
│   │   └── ConditionValue.ts    # Condition evaluation
│   ├── events/                   # Event system
│   │   ├── Event.ts             # Base event class
│   │   ├── Process.ts           # Process management
│   │   ├── Timeout.ts           # Delay events
│   │   └── Initialize.ts        # Process initialization
│   ├── resources/               # Resource management
│   │   ├── Resource.ts          # Main resource class
│   │   ├── BaseResource.ts      # Abstract base
│   │   ├── GetResource.ts       # Resource request event
│   │   └── PutResource.ts       # Resource release event
│   ├── monitoring/              # Monitoring system
│   │   ├── Monitor.ts           # Main coordinator
│   │   ├── Logger.ts            # Logging functionality
│   │   └── PerformanceMonitor.ts # Performance tracking
│   ├── errors/                  # Error classes
│   │   ├── Interrupt.ts         # Process interruption
│   │   ├── StopSimulation.ts    # Simulation termination
│   │   └── EmptySchedule.ts     # Empty queue error
│   ├── types.ts                 # Type definitions
│   └── SimJS.ts                 # Main export file
├── tests/                       # Test files
│   ├── core/                    # Core tests
│   ├── resources/               # Resource tests
│   └── monitoring/              # Monitoring tests
├── examples/                    # Example implementations
│   ├── monitoring-example.ts    # Banking simulation
│   ├── manufacturing-example.ts # Production line
│   └── service-example.ts       # Hospital ED
├── docs/                        # Documentation
├── dist/                        # Compiled output
└── coverage/                    # Test coverage reports
```

---

## Building and Testing

### Build Process

The build process uses TypeScript compiler and Rollup for bundling:

1. **TypeScript Compilation**: Converts `.ts` files to `.js` with type declarations
2. **Rollup Bundling**: Creates optimized bundles for different environments:
   - ESM: `dist/simjs.js`
   - Minified ESM: `dist/simjs.min.js`
   - UMD: `dist/simjs.umd.js`
   - Minified UMD: `dist/simjs.umd.min.js`

### Test Strategy

Tests are written using Jest with the following structure:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Performance Tests**: Measure execution performance
- **Example Tests**: Validate example code functionality

```bash
# Run specific test suites
npm test -- tests/core/
npm test -- tests/monitoring/

# Run tests with coverage
npm run test:coverage

# Run performance tests
npm test -- tests/Performance.test.ts
```

---

## Core Concepts

### Event-Driven Simulation

SimJS uses discrete event simulation where:

1. **Events** represent things that happen at specific times
2. **Environment** manages simulation time and event scheduling
3. **Processes** are generator functions that yield events
4. **Resources** represent limited capacity entities

### Generator-Based Processes

Processes use JavaScript generators for pausable execution:

```typescript
function* myProcess(env: Environment) {
    console.log('Starting at', env.now);
    yield new Timeout(env, 5);  // Pause for 5 time units
    console.log('Resuming at', env.now);
    yield someEvent;            // Wait for event
    console.log('Completed');
}
```

### Priority Queue

The event queue uses a binary heap for efficient O(log n) operations:

- Events are ordered by execution time
- Priority levels provide ordering for simultaneous events
- The heap maintains the simulation's temporal ordering

---

## Extending SimJS

### Creating Custom Events

```typescript
import { Event, Environment } from 'simjs';

export class CustomEvent extends Event {
    constructor(env: Environment, private data: any) {
        super(env);
        // Custom initialization
        this.scheduleExecution();
    }

    private scheduleExecution(): void {
        // Schedule when this event should trigger
        env.schedule(this, 'NORMAL', 0);
        this.succeed(this.data);
    }
}
```

### Custom Resources

```typescript
import { BaseResource, Environment } from 'simjs';

export class CustomResource extends BaseResource {
    constructor(env: Environment, capacity: number) {
        super(env, capacity);
    }

    // Override resource behavior
    protected canRequest(amount: number): boolean {
        return this.available >= amount;
    }
}
```

### Monitoring Extensions

```typescript
import { MonitoringHook, BaseLogEntry } from 'simjs';

const customHook: MonitoringHook = (entry: BaseLogEntry) => {
    if (entry.level === 'ERROR') {
        // Custom error handling
        console.error('Simulation error:', entry.message);
        // Send to external monitoring system
    }
};

monitor.addHook(customHook);
```

---

## Performance Considerations

### Memory Management

- **Event Cleanup**: Events are automatically cleaned up after processing
- **Resource Pools**: Reuse objects when possible to reduce garbage collection
- **Log Rotation**: Configure `maxLogEntries` to prevent memory growth

### Optimization Strategies

1. **Batch Operations**: Group similar operations to reduce overhead
2. **Lazy Evaluation**: Delay expensive computations until needed
3. **Efficient Data Structures**: Use appropriate collections for your use case

### Performance Monitoring

```typescript
const monitor = new Monitor({
    enablePerformanceMonitoring: true,
    performanceSampleInterval: 1000 // Sample every second
});

// Get performance metrics
const metrics = monitor.getPerformanceSummary();
console.log('Average event execution time:', metrics.averageEventExecutionTime);
```

---

## Best Practices

### Code Organization

1. **Separate Concerns**: Keep simulation logic separate from business logic
2. **Use Types**: Leverage TypeScript for better error catching
3. **Error Handling**: Always handle potential interruptions and failures

### Simulation Design

1. **Model Validation**: Verify your model represents reality accurately
2. **Statistical Rigor**: Use proper random number generation and analysis
3. **Performance Testing**: Test with realistic data volumes

### Example Structure

```typescript
// Good: Clear separation of concerns
class BankSimulation {
    private env: Environment;
    private monitor: Monitor;
    private resources: Map<string, Resource>;

    constructor(config: SimulationConfig) {
        this.env = new Environment();
        this.monitor = new Monitor(config.monitoring);
        this.setupResources(config.resources);
    }

    run(duration: number): SimulationResults {
        this.startProcesses();
        this.env.run(duration);
        return this.generateResults();
    }
}
```

---

## Troubleshooting

### Common Issues

#### "EmptySchedule" Error

```typescript
// Problem: No events scheduled
try {
    env.run();
} catch (error) {
    if (error instanceof EmptySchedule) {
        console.log('Simulation completed - no more events');
    }
}
```

#### Memory Leaks

```typescript
// Problem: Too many log entries
const monitor = new Monitor({
    maxLogEntries: 10000, // Limit log size
    enablePerformanceMonitoring: false // Disable if not needed
});
```

#### Type Errors

```typescript
// Problem: Generator function types
const process = () => function* () {
    yield new Timeout(env, 5);
};

env.process(process()); // Correct invocation
```

### Debug Tools

```typescript
// Enable detailed logging
const monitor = new Monitor({
    logLevel: 'DEBUG',
    enableEventMonitoring: true
});

// Check simulation state
console.log('Current time:', env.now);
console.log('Next event time:', env.peek());
console.log('Active processes:', monitor.getMetrics(env).activeProcesses);
```

---

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comprehensive tests for new features
- Update documentation for API changes

### Testing Requirements

- All new features must have unit tests
- Integration tests for complex interactions
- Performance tests for optimization work
- Example code to demonstrate usage

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request with description

### Commit Message Format

```
type(scope): description

- feat: new feature
- fix: bug fix
- docs: documentation update
- test: add or update tests
- refactor: code refactoring
```

---

## API Stability

SimJS follows semantic versioning:

- **Major versions**: Breaking API changes
- **Minor versions**: New features, backward compatible
- **Patch versions**: Bug fixes, backward compatible

### Deprecation Policy

- Deprecated features are marked in documentation
- Deprecation warnings in console for 1 major version
- Removal in next major version

---

For more specific implementation details, see the [API Reference](./api-reference.md) and examine the source code in the `src/` directory. 