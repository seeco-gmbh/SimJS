import { 
    Environment, 
    Resource, 
    Timeout, 
    Monitor
} from '../dist/simjs.js';

// Manufacturing Simulation: Automotive Parts Factory
function manufacturingSimulation() {
    console.log('🏭 Starting Automotive Parts Manufacturing Simulation\n');

    // Create simulation environment
    const env = new Environment();

    // Setup monitoring
    const monitor = new Monitor({
        logLevel: 'INFO' as const,
        enableEventMonitoring: true,
        enableProcessMonitoring: true,
        enableResourceMonitoring: true,
        enablePerformanceMonitoring: true,
        performanceSampleInterval: 2000,
        maxLogEntries: 5000,
        outputFormat: 'TEXT' as const
    });

    monitor.start();
    monitor.instrumentEnvironment(env);

    // Production resources
    const machiningCenter = new Resource(env, 2);    // 2 CNC machines
    const assemblyStation = new Resource(env, 3);    // 3 assembly workers
    const qualityControl = new Resource(env, 1);     // 1 QC inspector
    const packagingArea = new Resource(env, 2);      // 2 packaging stations

    // Production statistics
    let partsProduced = 0;
    let defectivePartsTotal = 0;
    let totalCycleTime = 0;

    // Custom monitoring hook for production tracking
    monitor.addHook((entry) => {
        if (entry.type === 'PROCESS_COMPLETED' && entry.message.includes('Part')) {
            console.log(`📦 ${entry.message}`);
        }
        if (entry.type === 'RESOURCE_ACQUIRED' && entry.message.includes('Quality')) {
            console.log(`🔍 ${entry.message}`);
        }
    });

    // Raw material arrival process
    const rawMaterialArrival = () => function* () {
        let batchNumber = 1;
        
        while (true) {
            console.log(`🚛 Raw material batch ${batchNumber} delivered at ${env.now.toFixed(1)} minutes`);
            
            // Process 50 parts per batch
            for (let partId = 1; partId <= 50; partId++) {
                env.process(manufacturingProcess(`B${batchNumber}-P${partId}`));
                
                // Parts enter production line every 2-4 minutes
                const interArrivalTime = Math.random() * 2 + 2;
                yield new Timeout(env, interArrivalTime);
            }
            
            batchNumber++;
            
            // Steel delivery every 8 hours
            yield new Timeout(env, 480); // 8 hours = 480 minutes
        }
    };

    // Complete manufacturing process for a single part
    const manufacturingProcess = (partId: string) => function* () {
        const startTime = env.now;
        const process = env.activeProcess;
        
        if (process) {
            monitor.logProcessStart(process, env);
        }

        console.log(`🔧 Part ${partId} enters production line at ${startTime.toFixed(1)}`);

        try {
            // Step 1: Machining (CNC)
            monitor.logResourceRequest(machiningCenter, 1, env, process || undefined);
            const machiningRequest = machiningCenter.request();
            yield machiningRequest;
            monitor.logResourceAcquire(machiningCenter, 1, env, process || undefined);

            console.log(`⚙️ Part ${partId} starting machining at ${env.now.toFixed(1)}`);
            
            // Machining time: 15-25 minutes
            const machiningTime = Math.random() * 10 + 15;
            yield new Timeout(env, machiningTime);

            machiningCenter.release();
            monitor.logResourceRelease(machiningCenter, 1, env, process || undefined);

            // Step 2: Assembly
            monitor.logResourceRequest(assemblyStation, 1, env, process || undefined);
            const assemblyRequest = assemblyStation.request();
            yield assemblyRequest;
            monitor.logResourceAcquire(assemblyStation, 1, env, process || undefined);

            console.log(`🔩 Part ${partId} in assembly at ${env.now.toFixed(1)}`);
            
            // Assembly time: 10-20 minutes
            const assemblyTime = Math.random() * 10 + 10;
            yield new Timeout(env, assemblyTime);

            assemblyStation.release();
            monitor.logResourceRelease(assemblyStation, 1, env, process || undefined);

            // Step 3: Quality Control
            monitor.logResourceRequest(qualityControl, 1, env, process || undefined);
            const qcRequest = qualityControl.request();
            yield qcRequest;
            monitor.logResourceAcquire(qualityControl, 1, env, process || undefined);

            // QC inspection time: 5-10 minutes
            const inspectionTime = Math.random() * 5 + 5;
            yield new Timeout(env, inspectionTime);

            // Quality check: 5% defect rate
            const isDefective = Math.random() < 0.05;
            
            qualityControl.release();
            monitor.logResourceRelease(qualityControl, 1, env, process || undefined);

            if (isDefective) {
                defectivePartsTotal++;
                console.log(`❌ Part ${partId} failed quality control - scrapped`);
                
                if (process) {
                    monitor.logProcessComplete(process, env);
                }
                return;
            }

            console.log(`✅ Part ${partId} passed quality control`);

            // Step 4: Packaging
            monitor.logResourceRequest(packagingArea, 1, env, process || undefined);
            const packagingRequest = packagingArea.request();
            yield packagingRequest;
            monitor.logResourceAcquire(packagingArea, 1, env, process || undefined);

            // Packaging time: 3-7 minutes
            const packagingTime = Math.random() * 4 + 3;
            yield new Timeout(env, packagingTime);

            packagingArea.release();
            monitor.logResourceRelease(packagingArea, 1, env, process || undefined);

            // Part completed
            const cycleTime = env.now - startTime;
            partsProduced++;
            totalCycleTime += cycleTime;

            console.log(`📦 Part ${partId} completed and packaged at ${env.now.toFixed(1)} (cycle time: ${cycleTime.toFixed(1)} min)`);
            
            if (process) {
                monitor.logProcessComplete(process, env);
            }

        } catch (error) {
            console.log(`⚠️ Part ${partId} production interrupted: ${error}`);
            
            if (process) {
                monitor.logProcessInterrupt(process, env, error);
            }
        }
    };

    // Machine maintenance process
    const maintenanceProcess = () => function* () {
        while (true) {
            // Preventive maintenance every 24 hours
            yield new Timeout(env, 1440); // 24 hours = 1440 minutes
            
            console.log(`🔧 Starting preventive maintenance at ${env.now.toFixed(1)}`);
            
            // Take one machining center offline for maintenance
            const maintenanceRequest = machiningCenter.request();
            yield maintenanceRequest;
            
            console.log(`🛠️ Machining center under maintenance`);
            
            // Maintenance duration: 2-4 hours
            const maintenanceDuration = Math.random() * 120 + 120;
            yield new Timeout(env, maintenanceDuration);
            
            machiningCenter.release();
            console.log(`✅ Maintenance completed at ${env.now.toFixed(1)}`);
        }
    };

    // Production monitoring and reporting
    const productionReporter = () => function* () {
        while (true) {
            yield new Timeout(env, 120); // Report every 2 hours
            
            monitor.samplePerformance();
            
            const metrics = monitor.getMetrics(env);
            const resourceStates = monitor.getResourceStates();
            
            console.log(`\n📊 Production Report at ${env.now.toFixed(1)} minutes:`);
            console.log(`   Parts Produced: ${partsProduced}`);
            console.log(`   Defective Parts: ${defectivePartsTotal}`);
            console.log(`   Quality Rate: ${partsProduced > 0 ? ((partsProduced / (partsProduced + defectivePartsTotal)) * 100).toFixed(1) : 0}%`);
            console.log(`   Avg Cycle Time: ${partsProduced > 0 ? (totalCycleTime / partsProduced).toFixed(1) : 0} min`);
            console.log(`   Active Processes: ${metrics.activeProcesses}`);
            
            resourceStates.forEach(resource => {
                const utilizationIcon = resource.utilizationPercent > 80 ? '🔴' : 
                                      resource.utilizationPercent > 50 ? '🟡' : '🟢';
                console.log(`   ${resource.id}: ${utilizationIcon} ${resource.utilizationPercent.toFixed(1)}% utilized`);
            });
            
            console.log(`   Memory Usage: ${metrics.performanceMetrics.heapUsed.toFixed(1)} MB\n`);
        }
    };

    // Start simulation processes
    env.process(rawMaterialArrival());
    env.process(maintenanceProcess());
    env.process(productionReporter());

    // Run simulation for 3 days (4320 minutes)
    try {
        env.run(4320);
    } catch (error) {
        console.log('Simulation completed');
    }

    // Final production summary
    console.log('\n🎯 Final Production Summary');
    console.log('═'.repeat(60));
    
    const finalMetrics = monitor.getMetrics(env);
    const logStats = monitor.getLogStatistics();
    const perfSummary = monitor.getPerformanceSummary();
    
    console.log(`Total Production Time: ${env.now.toFixed(1)} minutes (${(env.now / 1440).toFixed(1)} days)`);
    console.log(`Parts Successfully Produced: ${partsProduced}`);
    console.log(`Defective Parts: ${defectivePartsTotal}`);
    console.log(`Overall Quality Rate: ${((partsProduced / (partsProduced + defectivePartsTotal)) * 100).toFixed(2)}%`);
    console.log(`Average Cycle Time: ${(totalCycleTime / partsProduced).toFixed(1)} minutes`);
    console.log(`Production Rate: ${(partsProduced / (env.now / 60)).toFixed(2)} parts/hour`);

    console.log(`\n📈 Resource Efficiency:`);
    const resourceStates = monitor.getResourceStates();
    resourceStates.forEach(resource => {
        console.log(`  ${resource.id}: ${resource.utilizationPercent.toFixed(1)}% average utilization`);
        console.log(`    Total requests: ${resource.requestsTotal}`);
        console.log(`    Total releases: ${resource.releasesTotal}`);
    });

    console.log(`\n💻 System Performance:`);
    console.log(`  Total Events Processed: ${finalMetrics.eventsProcessed}`);
    console.log(`  Peak Memory Usage: ${perfSummary.peakMemoryUsage.toFixed(1)} MB`);
    console.log(`  Average Events/Second: ${perfSummary.averageEventsPerSecond.toFixed(1)}`);

    // Export detailed logs
    const logExport = monitor.exportLogs();
    console.log(`\n📄 Production log exported (${logExport.split('\n').length} entries)`);

    monitor.stop();
}

// Run the manufacturing simulation
manufacturingSimulation(); 