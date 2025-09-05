import { 
    Environment, 
    Process, 
    Resource, 
    Timeout, 
    Monitor
} from '../dist/simjs.js';

// Example: Bank Simulation with Comprehensive Monitoring
function bankSimulation() {
    console.log('🏦 Starting Bank Simulation with Monitoring\n');

    // Create environment
    const env = new Environment();

    // Configure monitoring
    const monitoringConfig = {
        logLevel: 'INFO' as const,
        enableEventMonitoring: true,
        enableProcessMonitoring: true,
        enableResourceMonitoring: true,
        enablePerformanceMonitoring: true,
        performanceSampleInterval: 1000, // Sample every second
        maxLogEntries: 5000,
        outputFormat: 'TEXT' as const
    };

    // Create monitor
    const monitor = new Monitor(monitoringConfig);
    
    // Add custom monitoring hook
    monitor.addHook((entry) => {
        if (entry.type === 'RESOURCE_ACQUIRED') {
            console.log(`🔒 ${entry.message}`);
        }
        if (entry.type === 'PROCESS_COMPLETED') {
            console.log(`✅ ${entry.message}`);
        }
    });

    // Start monitoring
    monitor.start();
    monitor.instrumentEnvironment(env);

    // Create bank resources
    const tellers = new Resource(env, 3); // 3 teller windows
    const manager = new Resource(env, 1); // 1 manager

    // Customer process generator
    const customer = (customerId: number) => function* () {
        const arrivalTime = env.now;
        console.log(`👤 Customer ${customerId} arrives at ${arrivalTime.toFixed(1)}`);
        
        const process = env.activeProcess;
        if (process) {
            monitor.logProcessStart(process, env);
        }

        // Simple customer - just needs a teller
        if (Math.random() < 0.8) {
            monitor.logResourceRequest(tellers, 1, env, process || undefined);
            const tellerRequest = tellers.request();
            yield tellerRequest;
            monitor.logResourceAcquire(tellers, 1, env, process || undefined);

            // Service time
            const serviceTime = Math.random() * 5 + 2; // 2-7 minutes
            yield new Timeout(env, serviceTime);

            // Release teller
            tellers.release();
            monitor.logResourceRelease(tellers, 1, env, process || undefined);

        } else {
            // Complex customer - needs manager
            monitor.logResourceRequest(manager, 1, env, process || undefined);
            const managerRequest = manager.request();
            yield managerRequest;
            monitor.logResourceAcquire(manager, 1, env, process || undefined);

            // Manager consultation time
            const consultTime = Math.random() * 10 + 5; // 5-15 minutes
            yield new Timeout(env, consultTime);

            // Release manager
            manager.release();
            monitor.logResourceRelease(manager, 1, env, process || undefined);
        }

        const serviceTime = env.now - arrivalTime;
        console.log(`🚪 Customer ${customerId} leaves after ${serviceTime.toFixed(1)} minutes`);
        
        if (process) {
            monitor.logProcessComplete(process, env);
        }
    };

    // Customer arrival process
    const customerArrivalProcess = () => function* () {
        let customerId = 1;
        
        while (true) {
            // Create new customer
            env.process(customer(customerId++));
            
            // Inter-arrival time (exponential distribution approximation)
            const interArrivalTime = -Math.log(Math.random()) * 3; // Average 3 minutes
            yield new Timeout(env, interArrivalTime);
        }
    };

    // Start customer arrivals
    env.process(customerArrivalProcess());

    // Performance monitoring process  
    const performanceReporter = () => function* () {
        while (true) {
            yield new Timeout(env, 10); // Report every 10 simulation minutes
            
            monitor.samplePerformance();
            
            const metrics = monitor.getMetrics(env);
            console.log(`\n📊 Simulation Report at time ${env.now.toFixed(1)}:`);
            console.log(`   Active Processes: ${metrics.activeProcesses}`);
            console.log(`   Events Processed: ${metrics.eventsProcessed}`);
            
            const resourceStates = monitor.getResourceStates();
            resourceStates.forEach(resource => {
                console.log(`   ${resource.id}: ${resource.utilizationPercent.toFixed(1)}% utilized (${resource.currentUsage}/${resource.capacity})`);
            });
            
            console.log(`   Memory Usage: ${metrics.performanceMetrics.heapUsed.toFixed(1)} MB`);
            console.log('');
        }
    }

    // Start performance reporting
    env.process(performanceReporter());

    // Run simulation
    try {
        env.run(60); // Run for 60 simulation minutes
    } catch (error) {
        console.log('Simulation completed or stopped');
    }

    // Final reporting
    console.log('\n🎯 Final Simulation Report');
    console.log('═'.repeat(50));

    const finalMetrics = monitor.getMetrics(env);
    console.log(`Total simulation time: ${finalMetrics.simulationTime.toFixed(1)} minutes`);
    console.log(`Total events processed: ${finalMetrics.eventsProcessed}`);

    const logStats = monitor.getLogStatistics();
    console.log(`\n📝 Logging Statistics:`);
    console.log(`  Total log entries: ${logStats.totalEntries}`);
    console.log(`  Entries by level:`, logStats.entriesByLevel);
    console.log(`  Entries by type:`, logStats.entriesByType);

    const perfSummary = monitor.getPerformanceSummary();
    console.log(`\n⚡ Performance Summary:`);
    console.log(`  Total runtime: ${perfSummary.totalRuntime.toFixed(2)} seconds`);
    console.log(`  Events per second: ${perfSummary.averageEventsPerSecond.toFixed(1)}`);
    console.log(`  Peak memory usage: ${perfSummary.peakMemoryUsage.toFixed(1)} MB`);
    console.log(`  Slowest event: ${perfSummary.slowestEventTime.toFixed(3)} ms`);
    console.log(`  Fastest event: ${perfSummary.fastestEventTime.toFixed(3)} ms`);

    const resourceStates = monitor.getResourceStates();
    console.log(`\n🏭 Resource Utilization Summary:`);
    resourceStates.forEach(resource => {
        console.log(`  ${resource.id} (${resource.type}):`);
        console.log(`    Final utilization: ${resource.utilizationPercent.toFixed(1)}%`);
        console.log(`    Total requests: ${resource.requestsTotal}`);
        console.log(`    Total releases: ${resource.releasesTotal}`);
    });

    // Export logs for analysis
    const logExport = monitor.exportLogs();
    console.log(`\n📄 Log export prepared (${logExport.split('\n').length} lines)`);
    console.log('First few log entries:');
    console.log(logExport.split('\n').slice(0, 5).join('\n'));

    // Stop monitoring
    monitor.stop();
}

// Example: Custom Monitoring Hook
function customMonitoringExample() {
    console.log('\n🔧 Custom Monitoring Hook Example\n');

    const env = new Environment();
    const monitor = new Monitor({
        logLevel: 'DEBUG' as const,
        outputFormat: 'JSON' as const
    });

    // Custom hook for real-time alerts
    const alertHook = (entry: any) => {
        if (entry.level === 'ERROR') {
            console.log(`🚨 ALERT: ${entry.message}`);
        }
        if (entry.type === 'RESOURCE_REQUESTED' && entry.metadata?.waitTime > 10) {
            console.log(`⏰ WARNING: Long wait time detected for ${entry.resourceId}`);
        }
    };

    // Custom hook for metrics collection
    const metricsCollector: any[] = [];
    const metricsHook = (entry: any) => {
        if (entry.type === 'PERFORMANCE_SAMPLE') {
            metricsCollector.push({
                time: entry.simulationTime,
                memory: entry.metrics.heapUsed,
                events: entry.metrics.eventsProcessed
            });
        }
    };

    monitor.addHook(alertHook);
    monitor.addHook(metricsHook);
    monitor.start();
    monitor.instrumentEnvironment(env);

    // Simple simulation to trigger hooks
    const testProcess = () => function* () {
        for (let i = 0; i < 5; i++) {
            yield new Timeout(env, 1);
            monitor.samplePerformance();
        }
    };

    env.process(testProcess());
    env.run();

    console.log(`Collected ${metricsCollector.length} performance samples`);
    console.log('Sample data:', metricsCollector);

    monitor.stop();
}

// Run examples
bankSimulation();
customMonitoringExample(); 