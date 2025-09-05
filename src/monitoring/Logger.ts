import { 
    BaseLogEntry, 
    LogLevel, 
    LogFormatter, 
    MonitoringHook, 
    MonitoringConfig
} from '../types.js';

export class Logger {
    private config: MonitoringConfig;
    private logEntries: BaseLogEntry[] = [];
    private hooks: MonitoringHook[] = [];
    private formatter: LogFormatter;

    private readonly LOG_LEVELS: Record<LogLevel, number> = {
        'DEBUG': 0,
        'INFO': 1,
        'WARN': 2,
        'ERROR': 3,
        'CRITICAL': 4
    };

    constructor(config: MonitoringConfig) {
        this.config = config;
        this.formatter = this.getFormatter(config.outputFormat);
    }

    private getFormatter(format: string): LogFormatter {
        switch (format) {
            case 'JSON':
                return this.jsonFormatter.bind(this);
            case 'CSV':
                return this.csvFormatter.bind(this);
            default:
                return this.textFormatter.bind(this);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.LOG_LEVELS[level] >= this.LOG_LEVELS[this.config.logLevel];
    }

    log(entry: BaseLogEntry): void {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        // Add real timestamp
        entry.timestamp = Date.now();

        // Store log entry
        this.logEntries.push(entry);

        // Enforce max log entries limit
        if (this.logEntries.length > this.config.maxLogEntries) {
            this.logEntries.shift();
        }

        // Execute hooks
        this.hooks.forEach(hook => {
            try {
                hook(entry);
            } catch (error) {
                // Silent failure to avoid logging loops
            }
        });
    }

    addHook(hook: MonitoringHook): void {
        this.hooks.push(hook);
    }

    removeHook(hook: MonitoringHook): void {
        const index = this.hooks.indexOf(hook);
        if (index > -1) {
            this.hooks.splice(index, 1);
        }
    }

    getLogEntries(filter?: Partial<BaseLogEntry>): BaseLogEntry[] {
        if (!filter) {
            return [...this.logEntries];
        }

        return this.logEntries.filter(entry => {
            return Object.entries(filter).every(([key, value]) => {
                return (entry as any)[key] === value;
            });
        });
    }

    exportLogs(): string {
        if (this.config.outputFormat === 'CSV') {
            return this.exportToCSV();
        } else if (this.config.outputFormat === 'JSON') {
            return this.exportToJSON();
        } else {
            return this.exportToText();
        }
    }

    private exportToCSV(): string {
        if (this.logEntries.length === 0) return '';

        const headers = ['timestamp', 'simulationTime', 'level', 'type', 'component', 'message', 'metadata'];
        
        const rows = this.logEntries.map(entry => [
            new Date(entry.timestamp).toISOString(),
            entry.simulationTime.toString(),
            entry.level,
            entry.type,
            entry.component,
            `"${entry.message.replace(/"/g, '""')}"`,
            entry.metadata ? `"${JSON.stringify(entry.metadata).replace(/"/g, '""')}"` : ''
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    private exportToJSON(): string {
        return JSON.stringify({
            exportTime: new Date().toISOString(),
            totalEntries: this.logEntries.length,
            config: this.config,
            entries: this.logEntries
        }, null, 2);
    }

    private exportToText(): string {
        return this.logEntries.map(entry => this.textFormatter(entry)).join('\n');
    }

    private textFormatter(entry: BaseLogEntry): string {
        const timestamp = new Date(entry.timestamp).toISOString();
        const simTime = entry.simulationTime.toFixed(3);
        const level = entry.level.padEnd(8);
        const component = entry.component.padEnd(12);
        
        let formatted = `[${timestamp}] [${simTime}] ${level} ${component} ${entry.message}`;
        
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
            formatted += ` | ${JSON.stringify(entry.metadata)}`;
        }

        return formatted;
    }

    private jsonFormatter(entry: BaseLogEntry): string {
        return JSON.stringify(entry);
    }

    private csvFormatter(entry: BaseLogEntry): string {
        const values = [
            new Date(entry.timestamp).toISOString(),
            entry.simulationTime.toString(),
            entry.level,
            entry.type,
            entry.component,
            `"${entry.message.replace(/"/g, '""')}"`,
            entry.metadata ? `"${JSON.stringify(entry.metadata).replace(/"/g, '""')}"` : ''
        ];
        return values.join(',');
    }

    clear(): void {
        this.logEntries = [];
    }

    getStatistics(): {
        totalEntries: number;
        entriesByLevel: Record<LogLevel, number>;
        entriesByType: Record<string, number>;
        entriesByComponent: Record<string, number>;
        timeRange: { start: number; end: number };
    } {
        const stats = {
            totalEntries: this.logEntries.length,
            entriesByLevel: {} as Record<LogLevel, number>,
            entriesByType: {} as Record<string, number>,
            entriesByComponent: {} as Record<string, number>,
            timeRange: {
                start: this.logEntries.length > 0 ? this.logEntries[0].simulationTime : 0,
                end: this.logEntries.length > 0 ? this.logEntries[this.logEntries.length - 1].simulationTime : 0
            }
        };

        this.logEntries.forEach(entry => {
            // Count by level
            stats.entriesByLevel[entry.level] = (stats.entriesByLevel[entry.level] || 0) + 1;
            
            // Count by type
            stats.entriesByType[entry.type] = (stats.entriesByType[entry.type] || 0) + 1;
            
            // Count by component
            stats.entriesByComponent[entry.component] = (stats.entriesByComponent[entry.component] || 0) + 1;
        });

        return stats;
    }
} 