import { PerformanceMetrics, PerformanceLogEntry } from '../types.js';
import { Logger } from './Logger.js';

export class PerformanceMonitor {
    private logger: Logger;
    private isMonitoring: boolean = false;
    private sampleInterval: number;
    
    // Metrics tracking
    private eventsProcessed: number = 0;
    private eventExecutionTimes: number[] = [];
    private simulationStartTime: number = 0;
    private eventQueueSize: number = 0;
    
    // Performance history for analysis
    private performanceHistory: PerformanceMetrics[] = [];
    private maxHistorySize: number = 1000;

    constructor(logger: Logger, sampleInterval: number = 1000) {
        this.logger = logger;
        this.sampleInterval = sampleInterval;
        this.simulationStartTime = Date.now();
    }

    start(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.simulationStartTime = Date.now();
    }

    stop(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
    }

    recordEventExecution(executionTime: number): void {
        this.eventsProcessed++;
        this.eventExecutionTimes.push(executionTime);
        
        // Keep only recent execution times to manage memory
        if (this.eventExecutionTimes.length > 10000) {
            this.eventExecutionTimes = this.eventExecutionTimes.slice(-5000);
        }
    }

    updateEventQueueSize(size: number): void {
        this.eventQueueSize = size;
    }

    sampleMetrics(): void {
        const currentTime = Date.now();
        const metrics = this.collectMetrics(currentTime);
        
        // Store in history
        this.performanceHistory.push(metrics);
        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }

        // Log performance sample
        const logEntry: PerformanceLogEntry = {
            timestamp: currentTime,
            simulationTime: (currentTime - this.simulationStartTime) / 1000,
            level: 'DEBUG',
            type: 'PERFORMANCE_SAMPLE',
            message: `Performance: ${metrics.eventsProcessed} events, ${metrics.simulationSpeed.toFixed(2)} events/sec, ${metrics.heapUsed.toFixed(1)}MB memory`,
            component: 'PerformanceMonitor',
            metrics: metrics
        };

        this.logger.log(logEntry);
    }

    private collectMetrics(currentTime: number): PerformanceMetrics {
        const memoryUsage = this.getMemoryUsage();
        const runtime = (currentTime - this.simulationStartTime) / 1000; // seconds
        
        return {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            eventQueueSize: this.eventQueueSize,
            eventsProcessed: this.eventsProcessed,
            averageEventExecutionTime: this.calculateAverageExecutionTime(),
            simulationSpeed: runtime > 0 ? this.eventsProcessed / runtime : 0,
            cpuUsage: this.getCPUUsage()
        };
    }

    private getMemoryUsage(): { heapUsed: number; heapTotal: number } {
        // Try to get memory usage from various sources
        try {
            // Node.js environment
            const nodeProcess = (globalThis as any).process;
            if (nodeProcess && nodeProcess.memoryUsage) {
                const usage = nodeProcess.memoryUsage();
                return {
                    heapUsed: usage.heapUsed / 1024 / 1024, // MB
                    heapTotal: usage.heapTotal / 1024 / 1024 // MB
                };
            }

            // Browser environment
            const browserPerf = (globalThis as any).performance;
            if (browserPerf && browserPerf.memory) {
                const memory = browserPerf.memory;
                return {
                    heapUsed: memory.usedJSHeapSize / 1024 / 1024,
                    heapTotal: memory.totalJSHeapSize / 1024 / 1024
                };
            }
        } catch (e) {
            // Silently fail and return defaults
        }

        return { heapUsed: 0, heapTotal: 0 };
    }

    private getCPUUsage(): number | undefined {
        try {
            const nodeProcess = (globalThis as any).process;
            if (nodeProcess && nodeProcess.cpuUsage) {
                const usage = nodeProcess.cpuUsage();
                return (usage.user + usage.system) / 1000000; // Convert to seconds
            }
        } catch (e) {
            // Silently fail
        }
        return undefined;
    }

    private calculateAverageExecutionTime(): number {
        if (this.eventExecutionTimes.length === 0) {
            return 0;
        }

        const sum = this.eventExecutionTimes.reduce((acc, time) => acc + time, 0);
        return sum / this.eventExecutionTimes.length;
    }

    getCurrentMetrics(): PerformanceMetrics {
        return this.collectMetrics(Date.now());
    }

    getPerformanceHistory(): PerformanceMetrics[] {
        return [...this.performanceHistory];
    }

    getPerformanceSummary(): {
        totalRuntime: number;
        totalEventsProcessed: number;
        averageEventsPerSecond: number;
        peakMemoryUsage: number;
        averageMemoryUsage: number;
        slowestEventTime: number;
        fastestEventTime: number;
        medianEventTime: number;
    } {
        const runtime = (Date.now() - this.simulationStartTime) / 1000;
        const avgEventsPerSecond = runtime > 0 ? this.eventsProcessed / runtime : 0;
        
        const memoryUsages = this.performanceHistory.map(m => m.heapUsed);
        const peakMemory = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;
        const avgMemory = memoryUsages.length > 0 ? 
            memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length : 0;

        const slowestEvent = this.eventExecutionTimes.length > 0 ? 
            Math.max(...this.eventExecutionTimes) : 0;
        const fastestEvent = this.eventExecutionTimes.length > 0 ? 
            Math.min(...this.eventExecutionTimes) : 0;

        // Calculate median
        let medianEvent = 0;
        if (this.eventExecutionTimes.length > 0) {
            const sorted = [...this.eventExecutionTimes].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            medianEvent = sorted.length % 2 === 0 ? 
                (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        }

        return {
            totalRuntime: runtime,
            totalEventsProcessed: this.eventsProcessed,
            averageEventsPerSecond: avgEventsPerSecond,
            peakMemoryUsage: peakMemory,
            averageMemoryUsage: avgMemory,
            slowestEventTime: slowestEvent,
            fastestEventTime: fastestEvent,
            medianEventTime: medianEvent
        };
    }

    reset(): void {
        this.eventsProcessed = 0;
        this.eventExecutionTimes = [];
        this.performanceHistory = [];
        this.simulationStartTime = Date.now();
        this.eventQueueSize = 0;
    }
} 