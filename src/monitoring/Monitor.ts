import { 
    MonitoringConfig, 
    SimulationMetrics, 
    BaseLogEntry,
    EventLogEntry,
    ProcessLogEntry,
    ResourceLogEntry,
    MonitoringHook,
    ResourceState,
    ProcessState
} from '../types.js';
import { Logger } from './Logger.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { Environment } from '../core/Environment.js';
import { Event } from '../events/Event.js';
import { Process } from '../events/Process.js';
import { Resource } from '../resources/Resource.js';

export class Monitor {
    private config: MonitoringConfig;
    private logger: Logger;
    private performanceMonitor: PerformanceMonitor;
    private isActive: boolean = false;
    
    // Tracking state
    private eventIdCounter: number = 0;
    private processIdCounter: number = 0;
    private resourceIdCounter: number = 0;
    
    // Component mappings for ID tracking
    private eventIds = new WeakMap<Event, string>();
    private processIds = new WeakMap<Process, string>();
    private resourceIds = new WeakMap<Resource, string>();
    
    // Active components tracking
    private activeProcesses = new Map<string, ProcessState>();
    private resourceStates = new Map<string, ResourceState>();

    constructor(config?: Partial<MonitoringConfig>) {
        this.config = this.mergeConfig(config);
        this.logger = new Logger(this.config);
        this.performanceMonitor = new PerformanceMonitor(
            this.logger, 
            this.config.performanceSampleInterval
        );
    }

    private mergeConfig(userConfig?: Partial<MonitoringConfig>): MonitoringConfig {
        const defaultConfig: MonitoringConfig = {
            logLevel: 'INFO',
            enableEventMonitoring: true,
            enableProcessMonitoring: true,
            enableResourceMonitoring: true,
            enablePerformanceMonitoring: true,
            performanceSampleInterval: 1000,
            maxLogEntries: 10000,
            outputFormat: 'TEXT'
        };

        return { ...defaultConfig, ...userConfig };
    }

    start(): void {
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor.start();
        }

        this.logger.log({
            timestamp: Date.now(),
            simulationTime: 0,
            level: 'INFO',
            type: 'SIMULATION_STARTED',
            message: 'Monitoring system started',
            component: 'Monitor',
            metadata: { config: this.config }
        });
    }

    stop(): void {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        this.performanceMonitor.stop();

        this.logger.log({
            timestamp: Date.now(),
            simulationTime: 0,
            level: 'INFO',
            type: 'SIMULATION_STOPPED',
            message: 'Monitoring system stopped',
            component: 'Monitor'
        });
    }

    // Performance sampling - call this manually to capture performance metrics
    samplePerformance(): void {
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor.sampleMetrics();
        }
    }

    // Environment monitoring methods
    instrumentEnvironment(env: Environment): void {
        if (!this.config.enableEventMonitoring) {
            return;
        }

        // Store original methods
        const originalSchedule = env.schedule.bind(env);
        const originalStep = env.step.bind(env);

        // Patch the schedule method
        env.schedule = (event: Event, priority: any = 'NORMAL', delay: number = 0) => {
            const eventId = this.getOrCreateEventId(event);
            
            const logEntry: EventLogEntry = {
                timestamp: Date.now(),
                simulationTime: env.now,
                level: 'DEBUG',
                type: 'EVENT_SCHEDULED',
                message: `Event ${eventId} scheduled with delay ${delay}`,
                component: 'Environment',
                eventId: eventId,
                eventType: event.constructor.name,
                priority: priority === 'URGENT' ? 0 : 1,
                delay: delay
            };

            this.logger.log(logEntry);
            return originalSchedule(event, priority, delay);
        };

        // Patch the step method
        env.step = () => {
            const startTime = Date.now();
            
            try {
                originalStep();
                const executionTime = Date.now() - startTime;
                
                if (this.config.enablePerformanceMonitoring) {
                    this.performanceMonitor.recordEventExecution(executionTime);
                }

                this.logger.log({
                    timestamp: Date.now(),
                    simulationTime: env.now,
                    level: 'DEBUG',
                    type: 'SIMULATION_STEPPED',
                    message: `Simulation step completed in ${executionTime}ms`,
                    component: 'Environment',
                    metadata: { executionTime, simulationTime: env.now }
                });

            } catch (error) {
                const executionTime = Date.now() - startTime;
                
                this.logger.log({
                    timestamp: Date.now(),
                    simulationTime: env.now,
                    level: 'ERROR',
                    type: 'SIMULATION_ERROR',
                    message: `Simulation step failed: ${error}`,
                    component: 'Environment',
                    metadata: { error: error instanceof Error ? error.message : String(error), executionTime }
                });
                
                throw error;
            }
        };
    }

    // Event monitoring methods
    logEventSuccess(event: Event, env: Environment): void {
        if (!this.config.enableEventMonitoring) return;

        const eventId = this.getOrCreateEventId(event);
        const logEntry: EventLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'DEBUG',
            type: 'EVENT_SUCCEEDED',
            message: `Event ${eventId} succeeded`,
            component: 'Event',
            eventId: eventId,
            eventType: event.constructor.name
        };

        this.logger.log(logEntry);
    }

    logEventFailure(event: Event, env: Environment, error: any): void {
        if (!this.config.enableEventMonitoring) return;

        const eventId = this.getOrCreateEventId(event);
        const logEntry: EventLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'WARN',
            type: 'EVENT_FAILED',
            message: `Event ${eventId} failed: ${error}`,
            component: 'Event',
            eventId: eventId,
            eventType: event.constructor.name,
            error: error instanceof Error ? error.message : String(error)
        };

        this.logger.log(logEntry);
    }

    // Process monitoring methods
    logProcessStart(process: Process, env: Environment): void {
        if (!this.config.enableProcessMonitoring) return;

        const processId = this.getOrCreateProcessId(process);
        
        // Track process state
        this.activeProcesses.set(processId, {
            id: processId,
            name: process.name,
            state: 'RUNNING',
            startTime: env.now,
            lastActivity: env.now,
            yieldCount: 0
        });

        const logEntry: ProcessLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'INFO',
            type: 'PROCESS_STARTED',
            message: `Process ${processId} (${process.name}) started`,
            component: 'Process',
            processId: processId,
            processName: process.name,
            state: 'RUNNING'
        };

        this.logger.log(logEntry);
    }

    logProcessYield(process: Process, env: Environment, yieldedEvent: Event): void {
        if (!this.config.enableProcessMonitoring) return;

        const processId = this.getOrCreateProcessId(process);
        const eventId = this.getOrCreateEventId(yieldedEvent);

        // Update process state
        const processState = this.activeProcesses.get(processId);
        if (processState) {
            processState.state = 'WAITING';
            processState.lastActivity = env.now;
            processState.yieldCount++;
        }

        const logEntry: ProcessLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'DEBUG',
            type: 'PROCESS_YIELDED',
            message: `Process ${processId} yielded to event ${eventId}`,
            component: 'Process',
            processId: processId,
            processName: process.name,
            state: 'WAITING',
            yieldedEvent: eventId
        };

        this.logger.log(logEntry);
    }

    logProcessComplete(process: Process, env: Environment): void {
        if (!this.config.enableProcessMonitoring) return;

        const processId = this.getOrCreateProcessId(process);
        
        // Update process state
        const processState = this.activeProcesses.get(processId);
        if (processState) {
            processState.state = 'COMPLETED';
            processState.lastActivity = env.now;
        }

        const logEntry: ProcessLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'INFO',
            type: 'PROCESS_COMPLETED',
            message: `Process ${processId} (${process.name}) completed`,
            component: 'Process',
            processId: processId,
            processName: process.name,
            state: 'COMPLETED'
        };

        this.logger.log(logEntry);
    }

    logProcessInterrupt(process: Process, env: Environment, cause: any): void {
        if (!this.config.enableProcessMonitoring) return;

        const processId = this.getOrCreateProcessId(process);
        
        // Update process state
        const processState = this.activeProcesses.get(processId);
        if (processState) {
            processState.state = 'INTERRUPTED';
            processState.lastActivity = env.now;
        }

        const logEntry: ProcessLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'WARN',
            type: 'PROCESS_INTERRUPTED',
            message: `Process ${processId} (${process.name}) interrupted`,
            component: 'Process',
            processId: processId,
            processName: process.name,
            state: 'INTERRUPTED',
            interruptCause: cause
        };

        this.logger.log(logEntry);
    }

    // Resource monitoring methods
    logResourceRequest(resource: Resource, amount: number, env: Environment, requestingProcess?: Process): void {
        if (!this.config.enableResourceMonitoring) return;

        const resourceId = this.getOrCreateResourceId(resource);
        const processId = requestingProcess ? this.getOrCreateProcessId(requestingProcess) : undefined;

        // Update resource state
        const resourceState = this.getOrCreateResourceState(resourceId, resource);
        resourceState.requestsTotal++;

        const logEntry: ResourceLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'DEBUG',
            type: 'RESOURCE_REQUESTED',
            message: `Resource ${resourceId} requested (amount: ${amount})`,
            component: 'Resource',
            resourceId: resourceId,
            resourceType: resource.constructor.name,
            amount: amount,
            currentUsage: resource.users.length,
            capacity: resource.capacity,
            processId: processId
        };

        this.logger.log(logEntry);
    }

    logResourceAcquire(resource: Resource, amount: number, env: Environment, requestingProcess?: Process): void {
        if (!this.config.enableResourceMonitoring) return;

        const resourceId = this.getOrCreateResourceId(resource);
        const processId = requestingProcess ? this.getOrCreateProcessId(requestingProcess) : undefined;

        // Update resource state
        const resourceState = this.getOrCreateResourceState(resourceId, resource);
        resourceState.currentUsage = resource.users.length;
        resourceState.utilizationPercent = resource.capacity > 0 ? (resource.users.length / resource.capacity) * 100 : 0;

        const logEntry: ResourceLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'DEBUG',
            type: 'RESOURCE_ACQUIRED',
            message: `Resource ${resourceId} acquired (amount: ${amount})`,
            component: 'Resource',
            resourceId: resourceId,
            resourceType: resource.constructor.name,
            amount: amount,
            currentUsage: resource.users.length,
            capacity: resource.capacity,
            processId: processId
        };

        this.logger.log(logEntry);
    }

    logResourceRelease(resource: Resource, amount: number, env: Environment, releasingProcess?: Process): void {
        if (!this.config.enableResourceMonitoring) return;

        const resourceId = this.getOrCreateResourceId(resource);
        const processId = releasingProcess ? this.getOrCreateProcessId(releasingProcess) : undefined;

        // Update resource state
        const resourceState = this.getOrCreateResourceState(resourceId, resource);
        resourceState.currentUsage = resource.users.length;
        resourceState.utilizationPercent = resource.capacity > 0 ? (resource.users.length / resource.capacity) * 100 : 0;
        resourceState.releasesTotal++;

        const logEntry: ResourceLogEntry = {
            timestamp: Date.now(),
            simulationTime: env.now,
            level: 'DEBUG',
            type: 'RESOURCE_RELEASED',
            message: `Resource ${resourceId} released (amount: ${amount})`,
            component: 'Resource',
            resourceId: resourceId,
            resourceType: resource.constructor.name,
            amount: amount,
            currentUsage: resource.users.length,
            capacity: resource.capacity,
            processId: processId
        };

        this.logger.log(logEntry);
    }

    // ID management methods
    private getOrCreateEventId(event: Event): string {
        if (!this.eventIds.has(event)) {
            this.eventIds.set(event, `E${++this.eventIdCounter}`);
        }
        return this.eventIds.get(event)!;
    }

    private getOrCreateProcessId(process: Process): string {
        if (!this.processIds.has(process)) {
            this.processIds.set(process, `P${++this.processIdCounter}`);
        }
        return this.processIds.get(process)!;
    }

    private getOrCreateResourceId(resource: Resource): string {
        if (!this.resourceIds.has(resource)) {
            this.resourceIds.set(resource, `R${++this.resourceIdCounter}`);
        }
        return this.resourceIds.get(resource)!;
    }

    private getOrCreateResourceState(resourceId: string, resource: Resource): ResourceState {
        if (!this.resourceStates.has(resourceId)) {
            this.resourceStates.set(resourceId, {
                id: resourceId,
                type: resource.constructor.name,
                capacity: resource.capacity,
                currentUsage: resource.users.length,
                queueLength: 0, // Would need access to BaseResource queue
                utilizationPercent: resource.capacity > 0 ? (resource.users.length / resource.capacity) * 100 : 0,
                requestsTotal: 0,
                releasesTotal: 0
            });
        }
        return this.resourceStates.get(resourceId)!;
    }

    // Public API methods
    addHook(hook: MonitoringHook): void {
        this.logger.addHook(hook);
    }

    removeHook(hook: MonitoringHook): void {
        this.logger.removeHook(hook);
    }

    getMetrics(env: Environment): SimulationMetrics {
        const resourceUtilization: Record<string, number> = {};
        this.resourceStates.forEach((state, id) => {
            resourceUtilization[id] = state.utilizationPercent / 100;
        });

        return {
            simulationTime: env.now,
            realTime: Date.now(),
            eventsProcessed: this.performanceMonitor.getCurrentMetrics().eventsProcessed,
            activeProcesses: Array.from(this.activeProcesses.values()).filter(p => p.state === 'RUNNING' || p.state === 'WAITING').length,
            queuedEvents: 0, // Would need access to env._queue.size()
            resourceUtilization: resourceUtilization,
            performanceMetrics: this.performanceMonitor.getCurrentMetrics()
        };
    }

    getProcessStates(): ProcessState[] {
        return Array.from(this.activeProcesses.values());
    }

    getResourceStates(): ResourceState[] {
        return Array.from(this.resourceStates.values());
    }

    exportLogs(): string {
        return this.logger.exportLogs();
    }

    getLogStatistics() {
        return this.logger.getStatistics();
    }

    getPerformanceSummary() {
        return this.performanceMonitor.getPerformanceSummary();
    }

    reset(): void {
        this.logger.clear();
        this.performanceMonitor.reset();
        this.eventIdCounter = 0;
        this.processIdCounter = 0;
        this.resourceIdCounter = 0;
        this.activeProcesses.clear();
        this.resourceStates.clear();
    }
} 