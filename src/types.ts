// Priority levels for scheduling events
export type Priority = 'NORMAL' | 'URGENT';

// Event callback function type (Event will be imported where needed)
export type EventCallback = (event: any) => void;

// Comparator function for heap operations
export type Comparator<T> = (a: T, b: T) => number;

// Queue item structure for the event scheduler
export interface QueueItem {
    time: number;
    priority: number;
    eid: number;
    event: any; // Will be typed as Event in Environment
}

// Generator function type for processes
export type GeneratorFunction = (...args: any[]) => Generator<any, any, any>;

// Condition evaluation function
export type ConditionEvaluator = (events: any[], count: number) => boolean;

// Status types for events
export type EventStatus = 'PENDING' | any;

// Core monitoring types for simulation data
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type MonitoringEventType = 
    | 'EVENT_SCHEDULED' 
    | 'EVENT_EXECUTED' 
    | 'EVENT_SUCCEEDED' 
    | 'EVENT_FAILED'
    | 'PROCESS_STARTED' 
    | 'PROCESS_RESUMED' 
    | 'PROCESS_YIELDED' 
    | 'PROCESS_COMPLETED' 
    | 'PROCESS_INTERRUPTED'
    | 'RESOURCE_REQUESTED' 
    | 'RESOURCE_ACQUIRED' 
    | 'RESOURCE_RELEASED' 
    | 'RESOURCE_QUEUE_JOINED' 
    | 'RESOURCE_QUEUE_LEFT'
    | 'SIMULATION_STARTED' 
    | 'SIMULATION_STEPPED' 
    | 'SIMULATION_STOPPED' 
    | 'SIMULATION_ERROR'
    | 'PERFORMANCE_SAMPLE';

export interface BaseLogEntry {
    timestamp: number;
    simulationTime: number;
    level: LogLevel;
    type: MonitoringEventType;
    message: string;
    component: string;
    metadata?: Record<string, any>;
}

export interface EventLogEntry extends BaseLogEntry {
    type: 'EVENT_SCHEDULED' | 'EVENT_EXECUTED' | 'EVENT_SUCCEEDED' | 'EVENT_FAILED';
    eventId: string;
    eventType: string;
    priority?: number;
    delay?: number;
    executionTime?: number;
    error?: string;
}

export interface ProcessLogEntry extends BaseLogEntry {
    type: 'PROCESS_STARTED' | 'PROCESS_RESUMED' | 'PROCESS_YIELDED' | 'PROCESS_COMPLETED' | 'PROCESS_INTERRUPTED';
    processId: string;
    processName: string;
    state?: string;
    yieldedEvent?: string;
    interruptCause?: any;
}

export interface ResourceLogEntry extends BaseLogEntry {
    type: 'RESOURCE_REQUESTED' | 'RESOURCE_ACQUIRED' | 'RESOURCE_RELEASED' | 'RESOURCE_QUEUE_JOINED' | 'RESOURCE_QUEUE_LEFT';
    resourceId: string;
    resourceType: string;
    amount?: number;
    currentUsage?: number;
    capacity?: number;
    queueLength?: number;
    processId?: string;
}

export interface PerformanceLogEntry extends BaseLogEntry {
    type: 'PERFORMANCE_SAMPLE';
    metrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
    heapUsed: number;
    heapTotal: number;
    eventQueueSize: number;
    eventsProcessed: number;
    averageEventExecutionTime: number;
    simulationSpeed: number; // events per second
    cpuUsage?: number;
}

export interface MonitoringConfig {
    logLevel: LogLevel;
    enableEventMonitoring: boolean;
    enableProcessMonitoring: boolean;
    enableResourceMonitoring: boolean;
    enablePerformanceMonitoring: boolean;
    performanceSampleInterval: number; // milliseconds
    maxLogEntries: number;
    outputFormat: 'JSON' | 'TEXT' | 'CSV';
    exportPath?: string;
}

export interface SimulationMetrics {
    simulationTime: number;
    realTime: number;
    eventsProcessed: number;
    activeProcesses: number;
    queuedEvents: number;
    resourceUtilization: Record<string, number>;
    performanceMetrics: PerformanceMetrics;
}

export interface ResourceState {
    id: string;
    type: string;
    capacity: number;
    currentUsage: number;
    queueLength: number;
    utilizationPercent: number;
    requestsTotal: number;
    releasesTotal: number;
}

export interface ProcessState {
    id: string;
    name: string;
    state: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'INTERRUPTED';
    startTime: number;
    lastActivity: number;
    yieldCount: number;
}

export type LogFormatter = (entry: BaseLogEntry) => string;
export type MonitoringHook = (entry: BaseLogEntry) => void; 