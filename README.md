# SimJS

SimJS is a powerful, type-safe discrete event simulation library written in TypeScript. It enables the modeling and execution of complex simulations with events, processes, resource management, and comprehensive monitoring capabilities.

## Features

- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **JavaScript Compatible**: Can be used in both TypeScript and JavaScript projects
- **Event-Driven Simulation**: Discrete event simulation with priority scheduling
- **Process Management**: Generator-based processes for complex simulations
- **Resource Management**: Built-in resource allocation and management with monitoring
- **Comprehensive Monitoring**: Built-in logging, performance tracking, and metrics collection
- **Extensive Examples**: Manufacturing, service, and banking simulation examples
- **High Performance**: Optimized event queue with O(log n) operations
- **Comprehensive Testing**: Extensive test suite with high coverage

## Installation

```bash
npm install simjs
```

## Quick Start

### Basic Simulation

```typescript
import { Environment, Timeout } from 'simjs';

const env = new Environment();

function* simpleProcess() {
    console.log('Process started at', env.now);
    yield new Timeout(env, 5);
    console.log('Process completed at', env.now);
}

env.process(simpleProcess);
env.run();
```

### Resource Management

```typescript
import { Environment, Resource, Timeout } from 'simjs';

const env = new Environment();
const server = new Resource(env, 2); // 2 servers

function* customer(id: number) {
    console.log(`Customer ${id} arrives at ${env.now}`);
    
    const request = server.request();
    yield request;
    
    console.log(`Customer ${id} starts service at ${env.now}`);
    yield new Timeout(env, 3);
    
    server.release();
    console.log(`Customer ${id} leaves at ${env.now}`);
}

// Create multiple customers
for (let i = 1; i <= 5; i++) {
    env.process(customer(i));
}

env.run();
```

### Monitoring and Logging

```typescript
import { Environment, Monitor, Resource, Timeout } from 'simjs';

const env = new Environment();
const monitor = new Monitor({
    logLevel: 'INFO',
    enableResourceMonitoring: true,
    enablePerformanceMonitoring: true
});

monitor.start();
monitor.instrumentEnvironment(env);

const resource = new Resource(env, 1);

function* process() {
    const request = resource.request();
    yield request;
    
    yield new Timeout(env, 2);
    
    resource.release();
}

env.process(process);
env.run();

// Export simulation data
const metrics = monitor.getMetrics(env);
console.log('Events processed:', metrics.eventsProcessed);
console.log('Resource utilization:', metrics.resourceUtilization);

monitor.stop();
```

## Examples

SimJS includes comprehensive examples demonstrating real-world simulation scenarios:

### Banking Simulation
- **File**: `examples/monitoring-example.ts`
- **Features**: Customer arrivals, teller services, queue management, and performance monitoring
- **Use Case**: Service queue optimization and capacity planning

### Manufacturing Simulation
- **File**: `examples/manufacturing-example.ts`
- **Features**: Production line, quality control, maintenance, and resource utilization
- **Use Case**: Manufacturing efficiency analysis and bottleneck identification

### Hospital Emergency Department
- **File**: `examples/service-example.ts`
- **Features**: Patient triage, doctor assignments, test scheduling, and healthcare KPIs
- **Use Case**: Healthcare service optimization and patient flow analysis

Run examples with:
```bash
# Build first
npm run build

# Run specific examples
npx ts-node examples/monitoring-example.ts
npx ts-node examples/manufacturing-example.ts
npx ts-node examples/service-example.ts
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[API Reference](docs/api-reference.md)** - Complete API documentation with examples
- **[Developer Guide](docs/developer-guide.md)** - Architecture, development setup, and contribution guidelines
- **[Monitoring Guide](docs/monitoring-guide.md)** - Detailed monitoring and logging documentation

### Key Documentation Sections

- **Getting Started**: Basic concepts and first simulation
- **Core Classes**: Environment, Event, Process, Resource
- **Monitoring System**: Logger, PerformanceMonitor, custom hooks
- **Resource Management**: Advanced resource patterns and optimization
- **Performance**: Best practices and optimization strategies
- **Examples**: Real-world simulation patterns and use cases

## Development

### Building the Project

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Development Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run build:watch`: Watch for changes and recompile
- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report

## Core Features

### Event-Driven Simulation Engine
- **Priority-based event queue** with O(log n) performance
- **Discrete time advancement** for accurate simulation modeling
- **Generator-based processes** for intuitive flow control
- **Event composition** with AND/OR conditions

### Resource Management
- **Finite capacity resources** with automatic queuing
- **Request/release patterns** for resource allocation
- **Resource monitoring** with utilization tracking
- **Custom resource types** for specialized needs

### Comprehensive Monitoring
- **Multi-level logging** (DEBUG, INFO, WARN, ERROR, CRITICAL)
- **Performance metrics** (memory, CPU, event execution)
- **Resource utilization** tracking and reporting
- **Custom hooks** for specialized monitoring
- **Multiple export formats** (JSON, TEXT, CSV)

### Built-in Examples
- **Banking simulation** with customer service optimization
- **Manufacturing process** with quality control and maintenance
- **Hospital emergency department** with patient flow management

## API Overview

### Core Classes

- **`Environment`**: The simulation environment that manages time and events
- **`Event`**: Base class for all simulation events with condition support
- **`Process`**: Generator-based process management with interruption handling
- **`Timeout`**: Simple delay event for time-based operations
- **`Resource`**: Finite capacity resource with automatic queue management

### Monitoring Classes

- **`Monitor`**: Main monitoring coordinator with environment instrumentation
- **`Logger`**: Flexible logging system with filtering and export capabilities
- **`PerformanceMonitor`**: System performance tracking and metrics collection

### Error Classes

- **`EmptySchedule`**: Thrown when simulation has no more events to process
- **`Interrupt`**: Process interruption handling for complex scenarios
- **`StopSimulation`**: Graceful simulation termination with cleanup

For detailed API documentation, see [docs/api-reference.md](docs/api-reference.md).

## Use Cases

SimJS is ideal for:

- **Operations Research**: Queue optimization, capacity planning, workflow analysis
- **Manufacturing**: Production line simulation, quality control, maintenance scheduling
- **Healthcare**: Patient flow, resource allocation, emergency department optimization
- **Logistics**: Supply chain simulation, transportation networks, warehouse operations
- **Finance**: Risk modeling, trading system simulation, portfolio analysis
- **Education**: Teaching discrete event simulation concepts and methodology

## Compatibility

- **Node.js**: >=16.0.0
- **TypeScript**: >=5.0.0  
- **JavaScript**: ES2020+ (compiled output)
- **Browsers**: Modern browsers with ES2020 support
- **Package Managers**: npm, yarn, pnpm