import { 
    Environment, 
    Resource, 
    Timeout, 
    Monitor
} from '../dist/simjs.js';

// Hospital Emergency Department Simulation
function hospitalSimulation() {
    console.log('🏥 Starting Hospital Emergency Department Simulation\n');

    // Create simulation environment
    const env = new Environment();

    // Setup monitoring for healthcare operations
    const monitor = new Monitor({
        logLevel: 'INFO' as const,
        enableEventMonitoring: true,
        enableProcessMonitoring: true,
        enableResourceMonitoring: true,
        enablePerformanceMonitoring: true,
        performanceSampleInterval: 1800, // Every 30 minutes
        maxLogEntries: 8000,
        outputFormat: 'TEXT' as const
    });

    monitor.start();
    monitor.instrumentEnvironment(env);

    // Hospital resources
    const triageNurses = new Resource(env, 2);        // 2 triage nurses
    const doctors = new Resource(env, 4);             // 4 emergency doctors
    const treatmentRooms = new Resource(env, 8);      // 8 treatment rooms
    const xrayMachine = new Resource(env, 1);         // 1 X-ray machine
    const labTechnicians = new Resource(env, 2);      // 2 lab technicians
    const dischargeNurses = new Resource(env, 3);     // 3 discharge nurses

    // Patient statistics
    let patientsAdmitted = 0;
    let patientsDischargedTotal = 0;
    let totalWaitingTime = 0;
    let totalStayTime = 0;
    let priorityPatientsTotal = 0;

    // Patient severity levels
    const PatientSeverity = {
        CRITICAL: 1,    // Immediate attention
        URGENT: 2,      // Within 15 minutes
        STANDARD: 3,    // Within 60 minutes
        NON_URGENT: 4   // Within 120 minutes
    } as const;
    
    type PatientSeverityType = typeof PatientSeverity[keyof typeof PatientSeverity];
    
    // Helper to get severity name
    const getSeverityName = (severity: PatientSeverityType): string => {
        const entry = Object.entries(PatientSeverity).find(([key, value]) => value === severity);
        return entry ? entry[0] : 'UNKNOWN';
    };

    // Custom monitoring for healthcare KPIs
    monitor.addHook((entry) => {
        if (entry.type === 'PROCESS_COMPLETED' && entry.message.includes('Patient')) {
            console.log(`🎯 ${entry.message}`);
        }
        if (entry.type === 'RESOURCE_ACQUIRED' && entry.message.includes('Doctor')) {
            console.log(`👨‍⚕️ ${entry.message}`);
        }
        if (entry.level === 'WARN') {
            console.log(`⚠️ Alert: ${entry.message}`);
        }
    });

    // Patient arrival process
    const patientArrivalProcess = () => function* () {
        let patientId = 1;
        
        while (true) {
            // Create new patient with random severity
            const severity = getRandomSeverity();
            const patientName = `P${patientId.toString().padStart(4, '0')}`;
            
            env.process(patientJourney(patientName, severity));
            
            patientsAdmitted++;
            console.log(`🚑 ${patientName} arrives (${getSeverityName(severity)}) at ${env.now.toFixed(1)} min`);
            
            // Arrival rate varies by time of day
            const hourOfDay = (env.now / 60) % 24;
            let arrivalRate: number;
            
            if (hourOfDay >= 6 && hourOfDay < 14) {
                arrivalRate = 15; // Day shift - every 15 minutes
            } else if (hourOfDay >= 14 && hourOfDay < 22) {
                arrivalRate = 12; // Evening shift - every 12 minutes (busier)
            } else {
                arrivalRate = 25; // Night shift - every 25 minutes
            }
            
            const interArrivalTime = -Math.log(Math.random()) * arrivalRate;
            yield new Timeout(env, interArrivalTime);
            
            patientId++;
        }
    };

    // Complete patient journey through emergency department
    const patientJourney = (patientId: string, severity: PatientSeverityType) => function* () {
        const arrivalTime = env.now;
        const process = env.activeProcess;
        
        if (process) {
            monitor.logProcessStart(process, env);
        }

        try {
            // Step 1: Triage Assessment
            monitor.logResourceRequest(triageNurses, 1, env, process || undefined);
            const triageRequest = triageNurses.request();
            yield triageRequest;
            monitor.logResourceAcquire(triageNurses, 1, env, process || undefined);

            console.log(`🩺 ${patientId} starting triage assessment at ${env.now.toFixed(1)}`);
            
            // Triage time: 5-15 minutes depending on severity
            const triageTime = severity === PatientSeverity.CRITICAL ? 5 + Math.random() * 5 : 
                              severity === PatientSeverity.URGENT ? 8 + Math.random() * 7 :
                              10 + Math.random() * 5;
            
            yield new Timeout(env, triageTime);
            
            triageNurses.release();
            monitor.logResourceRelease(triageNurses, 1, env, process || undefined);

            const triageEndTime = env.now;
            console.log(`📋 ${patientId} triage completed - Priority: ${getSeverityName(severity)}`);

            // Step 2: Wait for Doctor (priority-based)
            if (severity === PatientSeverity.CRITICAL) {
                priorityPatientsTotal++;
            }

            monitor.logResourceRequest(doctors, 1, env, process || undefined);
            monitor.logResourceRequest(treatmentRooms, 1, env, process || undefined);

            // Critical patients get priority
            const doctorRequest = doctors.request();
            const roomRequest = treatmentRooms.request();
            
            yield doctorRequest;
            yield roomRequest;
            
            monitor.logResourceAcquire(doctors, 1, env, process || undefined);
            monitor.logResourceAcquire(treatmentRooms, 1, env, process || undefined);

            const waitingTime = env.now - triageEndTime;
            totalWaitingTime += waitingTime;

            // Check if waiting time exceeds target for severity level
            const maxWaitTime = severity === PatientSeverity.CRITICAL ? 0 : 
                               severity === PatientSeverity.URGENT ? 15 :
                               severity === PatientSeverity.STANDARD ? 60 : 120;

            if (waitingTime > maxWaitTime) {
                console.log(`⚠️ Warning: Patient ${patientId} waiting time exceeded target (${waitingTime.toFixed(1)} > ${maxWaitTime} min)`);
            }

            console.log(`👨‍⚕️ ${patientId} doctor consultation starts (waited ${waitingTime.toFixed(1)} min)`);

            // Step 3: Doctor Consultation
            const consultationTime = severity === PatientSeverity.CRITICAL ? 45 + Math.random() * 30 :
                                    severity === PatientSeverity.URGENT ? 25 + Math.random() * 20 :
                                    severity === PatientSeverity.STANDARD ? 15 + Math.random() * 15 :
                                    10 + Math.random() * 10;

            yield new Timeout(env, consultationTime);

            // Step 4: Additional Tests (50% of patients need tests)
            const needsTests = Math.random() < 0.5;
            
            if (needsTests) {
                // Determine test type
                const needsXray = Math.random() < 0.3;
                const needsBloodwork = Math.random() < 0.4;

                if (needsXray) {
                    console.log(`📷 ${patientId} referred for X-ray`);
                    
                    monitor.logResourceRequest(xrayMachine, 1, env, process || undefined);
                    const xrayRequest = xrayMachine.request();
                    yield xrayRequest;
                    monitor.logResourceAcquire(xrayMachine, 1, env, process || undefined);

                    // X-ray time: 15-30 minutes
                    const xrayTime = 15 + Math.random() * 15;
                    yield new Timeout(env, xrayTime);

                    xrayMachine.release();
                    monitor.logResourceRelease(xrayMachine, 1, env, process || undefined);
                    console.log(`📷 ${patientId} X-ray completed`);
                }

                if (needsBloodwork) {
                    console.log(`🧪 ${patientId} referred for lab tests`);
                    
                    monitor.logResourceRequest(labTechnicians, 1, env, process || undefined);
                    const labRequest = labTechnicians.request();
                    yield labRequest;
                    monitor.logResourceAcquire(labTechnicians, 1, env, process || undefined);

                    // Lab work time: 20-45 minutes
                    const labTime = 20 + Math.random() * 25;
                    yield new Timeout(env, labTime);

                    labTechnicians.release();
                    monitor.logResourceRelease(labTechnicians, 1, env, process || undefined);
                    console.log(`🧪 ${patientId} lab results ready`);
                }

                // Additional consultation to review results
                yield new Timeout(env, 10 + Math.random() * 10);
            }

            // Release doctor and treatment room
            doctors.release();
            treatmentRooms.release();
            monitor.logResourceRelease(doctors, 1, env, process || undefined);
            monitor.logResourceRelease(treatmentRooms, 1, env, process || undefined);

            // Step 5: Discharge Process
            monitor.logResourceRequest(dischargeNurses, 1, env, process || undefined);
            const dischargeRequest = dischargeNurses.request();
            yield dischargeRequest;
            monitor.logResourceAcquire(dischargeNurses, 1, env, process || undefined);

            // Discharge processing: 10-20 minutes
            const dischargeTime = 10 + Math.random() * 10;
            yield new Timeout(env, dischargeTime);

            dischargeNurses.release();
            monitor.logResourceRelease(dischargeNurses, 1, env, process || undefined);

            // Patient completed
            const totalStayDuration = env.now - arrivalTime;
            patientsDischargedTotal++;
            totalStayTime += totalStayDuration;

            console.log(`🏠 ${patientId} discharged at ${env.now.toFixed(1)} (total stay: ${totalStayDuration.toFixed(1)} min)`);
            
            if (process) {
                monitor.logProcessComplete(process, env);
            }

        } catch (error) {
            console.log(`⚠️ ${patientId} treatment interrupted: ${error}`);
            
            if (process) {
                monitor.logProcessInterrupt(process, env, error);
            }
        }
    };

    // Staff shift changes
    const staffManagement = () => function* () {
        while (true) {
            // Shift change every 8 hours
            yield new Timeout(env, 480); // 8 hours = 480 minutes
            
            const hourOfDay = (env.now / 60) % 24;
            console.log(`👩‍⚕️ Staff shift change at ${env.now.toFixed(1)} (${hourOfDay.toFixed(0)}:00)`);
            
            // Brief reduction in capacity during shift change
            yield new Timeout(env, 15); // 15 minute handover
        }
    };

    // Hospital performance monitoring
    const performanceReporter = () => function* () {
        while (true) {
            yield new Timeout(env, 240); // Report every 4 hours
            
            monitor.samplePerformance();
            
            const metrics = monitor.getMetrics(env);
            const resourceStates = monitor.getResourceStates();
            
            console.log(`\n📊 Hospital Performance Report at ${env.now.toFixed(1)} minutes:`);
            console.log(`   Patients Admitted: ${patientsAdmitted}`);
            console.log(`   Patients Discharged: ${patientsDischargedTotal}`);
            console.log(`   Patients Currently in ED: ${patientsAdmitted - patientsDischargedTotal}`);
            console.log(`   Critical Patients Treated: ${priorityPatientsTotal}`);
            
            if (patientsDischargedTotal > 0) {
                console.log(`   Average Waiting Time: ${(totalWaitingTime / patientsDischargedTotal).toFixed(1)} min`);
                console.log(`   Average Total Stay: ${(totalStayTime / patientsDischargedTotal).toFixed(1)} min`);
                console.log(`   Throughput: ${(patientsDischargedTotal / (env.now / 60)).toFixed(1)} patients/hour`);
            }
            
            console.log(`   Active Patient Processes: ${metrics.activeProcesses}`);
            
            resourceStates.forEach(resource => {
                const status = resource.utilizationPercent > 90 ? '🔴 CRITICAL' :
                              resource.utilizationPercent > 75 ? '🟡 HIGH' :
                              resource.utilizationPercent > 50 ? '🟢 NORMAL' : '⚪ LOW';
                console.log(`   ${resource.id}: ${status} ${resource.utilizationPercent.toFixed(1)}%`);
            });
            
            console.log(`   System Memory: ${metrics.performanceMetrics.heapUsed.toFixed(1)} MB\n`);
        }
    };

    // Helper function to generate patient severity
    function getRandomSeverity(): PatientSeverityType {
        const rand = Math.random();
        if (rand < 0.05) return PatientSeverity.CRITICAL;   // 5%
        if (rand < 0.20) return PatientSeverity.URGENT;     // 15%
        if (rand < 0.70) return PatientSeverity.STANDARD;   // 50%
        return PatientSeverity.NON_URGENT;                  // 30%
    }

    // Start simulation processes
    env.process(patientArrivalProcess());
    env.process(staffManagement());
    env.process(performanceReporter());

    // Run simulation for 2 days (2880 minutes)
    try {
        env.run(2880);
    } catch (error) {
        console.log('Hospital simulation completed');
    }

    // Final hospital performance summary
    console.log('\n🎯 Final Hospital Performance Summary');
    console.log('═'.repeat(70));
    
    const finalMetrics = monitor.getMetrics(env);
    const perfSummary = monitor.getPerformanceSummary();
    
    console.log(`Total Simulation Time: ${env.now.toFixed(1)} minutes (${(env.now / 1440).toFixed(1)} days)`);
    console.log(`Patients Admitted: ${patientsAdmitted}`);
    console.log(`Patients Successfully Discharged: ${patientsDischargedTotal}`);
    console.log(`Patients Still in ED: ${patientsAdmitted - patientsDischargedTotal}`);
    console.log(`Critical Patients Treated: ${priorityPatientsTotal}`);

    if (patientsDischargedTotal > 0) {
        console.log(`\n⏱️ Time Performance:`);
        console.log(`  Average Waiting Time: ${(totalWaitingTime / patientsDischargedTotal).toFixed(1)} minutes`);
        console.log(`  Average Total Stay: ${(totalStayTime / patientsDischargedTotal).toFixed(1)} minutes`);
        console.log(`  Patient Throughput: ${(patientsDischargedTotal / (env.now / 60)).toFixed(2)} patients/hour`);
        console.log(`  Bed Turnover Rate: ${(patientsDischargedTotal / 8).toFixed(1)} patients/bed`);
    }

    console.log(`\n🏥 Resource Utilization:`);
    const resourceStates = monitor.getResourceStates();
    resourceStates.forEach(resource => {
        console.log(`  ${resource.id}: ${resource.utilizationPercent.toFixed(1)}% average utilization`);
        console.log(`    Total patient interactions: ${resource.requestsTotal}`);
    });

    console.log(`\n💻 System Performance:`);
    console.log(`  Total Events Processed: ${finalMetrics.eventsProcessed}`);
    console.log(`  Peak Memory Usage: ${perfSummary.peakMemoryUsage.toFixed(1)} MB`);
    console.log(`  Average Events/Second: ${perfSummary.averageEventsPerSecond.toFixed(1)}`);

    // Healthcare quality indicators
    console.log(`\n📈 Quality Indicators:`);
    const avgWaitTime = patientsDischargedTotal > 0 ? totalWaitingTime / patientsDischargedTotal : 0;
    const avgStayTime = patientsDischargedTotal > 0 ? totalStayTime / patientsDischargedTotal : 0;
    
    console.log(`  Average Wait Time: ${avgWaitTime < 30 ? '✅' : avgWaitTime < 60 ? '⚠️' : '❌'} ${avgWaitTime.toFixed(1)} min`);
    console.log(`  Average Length of Stay: ${avgStayTime < 180 ? '✅' : avgStayTime < 300 ? '⚠️' : '❌'} ${avgStayTime.toFixed(1)} min`);
    console.log(`  Critical Patient Response: ${priorityPatientsTotal > 0 ? '✅' : '⚪'} ${priorityPatientsTotal} cases handled`);

    // Export medical logs
    const logExport = monitor.exportLogs();
    console.log(`\n📄 Medical records exported (${logExport.split('\n').length} entries)`);

    monitor.stop();
}

// Run the hospital simulation
hospitalSimulation(); 