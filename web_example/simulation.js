// Production Planning Simulation
// Using SimJS library for discrete event simulation

class ProductionSimulator {
    constructor() {
        this.env = null;
        this.monitor = null;
        this.isRunning = false;
        this.isPaused = false;
        this.simulationInterval = null;
        this.updateInterval = null;
        this.simulationSpeed = 5; // 1-10 scale
        
        // Resources
        this.resources = {};
        
        // Statistics
        this.stats = {
            partsProduced: 0,
            ordersCompleted: 0,
            ordersTotal: 0,
            scrapParts: 0,
            totalCycleTime: 0,
            onTimeDeliveries: 0,
            lateDeliveries: 0,
            machineBreakdowns: 0,
            totalWaitingTime: 0,
            waitingEvents: 0,
            orders: [],
            resources: {
                machines: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0, breakdowns: 0 },
                workers: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0, breaksTotal: 0 },
                forklifts: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0 },
                qcInspectors: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0, rejections: 0 }
            }
        };
        
        // Configuration
        this.config = {
            machines: 3,
            workers: 4,
            forklifts: 2,
            qcInspectors: 1,
            orderFrequency: 4, // orders per hour
            orderSize: 20,
            deadline: 24, // hours
            simTime: 24 // hours
        };
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Set up range sliders
        this.setupRangeSliders();
        
        // Theme toggle functionality
        this.setupThemeToggle();
        
        // Back to top button
        this.setupBackToTop();
        
        // Initialize simulation
        this.resetSimulation();
        
        // Initialize display with default values
        this.updateLiveMetrics();
        
        // Initialize speed display
        this.updateSimulationSpeed();
    }
    
    setupRangeSliders() {
        const sliders = [
            'machineCount', 'workerCount', 'forkliftCount', 'qcCount',
            'orderFrequency', 'orderSize', 'deadline', 'simTime'
        ];
        
        sliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    let value = e.target.value;
                    let displayValue = value;
                    
                    // Add units for specific sliders
                    if (id === 'orderFrequency') displayValue += ' orders/hour';
                    else if (id === 'deadline' || id === 'simTime') displayValue += ' hours';
                    
                    valueDisplay.textContent = displayValue;
                    
                    // Update config
                    const configKey = {
                        'machineCount': 'machines',
                        'workerCount': 'workers',
                        'forkliftCount': 'forklifts',
                        'qcCount': 'qcInspectors',
                        'orderFrequency': 'orderFrequency',
                        'orderSize': 'orderSize',
                        'deadline': 'deadline',
                        'simTime': 'simTime'
                    }[id];
                    
                    this.config[configKey] = parseInt(value);
                });
            }
        });
    }
    
    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        const track = document.getElementById('themeToggleTrack');
        const thumb = document.getElementById('themeToggleThumb');
        
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            track.classList.add('dark');
            thumb.classList.add('dark');
        }
        
        window.toggleTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (newTheme === 'dark') {
                track.classList.add('dark');
                thumb.classList.add('dark');
            } else {
                track.classList.remove('dark');
                thumb.classList.remove('dark');
            }
        };
    }
    
    setupBackToTop() {
        const backToTopBtn = document.getElementById('backToTopBtn');
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 100) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        window.scrollToTop = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };
    }
    
    startSimulation() {
        if (this.isRunning) return;
        
        try {
            this.resetStats();
            this.initializeResourceStats();
            this.updateUI('start');
            
            // Create new environment and monitor
            this.env = new SimJS.Environment();
            this.monitor = new SimJS.Monitor({
                logLevel: 'INFO',
                enableEventMonitoring: true,
                enableProcessMonitoring: true,
                enableResourceMonitoring: true,
                enablePerformanceMonitoring: true,
                performanceSampleInterval: 1000,
                maxLogEntries: 10000,
                outputFormat: 'TEXT'
            });
            
            this.monitor.start();
            this.monitor.instrumentEnvironment(this.env);
            
            // Set up monitoring hooks
            this.setupMonitoringHooks();
            
            // Create resources
            this.createResources();
            
            // Start production processes
            this.startProductionProcesses();
            
            this.isRunning = true;
            this.startLiveSimulation();
            
        } catch (error) {
            console.error('Error starting simulation:', error);
            this.showError('Failed to start simulation: ' + error.message);
        }
    }
    
    createResources() {
        // Production resources
        this.resources.machines = new SimJS.Resource(this.env, this.config.machines);
        this.resources.workers = new SimJS.Resource(this.env, this.config.workers);
        this.resources.forklifts = new SimJS.Resource(this.env, this.config.forklifts);
        this.resources.qcInspectors = new SimJS.Resource(this.env, this.config.qcInspectors);
        
        // Add resource names for monitoring
        this.resources.machines._name = 'CNC Machines';
        this.resources.workers._name = 'Assembly Workers';
        this.resources.forklifts._name = 'Forklifts';
        this.resources.qcInspectors._name = 'QC Inspectors';
    }
    
    setupMonitoringHooks() {
        this.monitor.addHook((entry) => {
            if (entry.type === 'PROCESS_COMPLETED' || entry.type === 'RESOURCE_ACQUIRED') {
                this.addLogEntry(entry.message);
            }
        });
    }
    
    startProductionProcesses() {
        // Customer order generation
        this.env.process(this.customerOrderProcess.bind(this));
        
        // Machine maintenance process
        this.env.process(this.maintenanceProcess.bind(this));
        
        // Worker break process
        this.env.process(this.workerBreakProcess.bind(this));
        
        // Real-time monitoring
        this.env.process(this.monitoringProcess.bind(this));
    }
    
    * customerOrderProcess() {
        let orderId = 1;
        const orderInterval = 60 / this.config.orderFrequency; // minutes between orders
        
        while (this.env.now < this.config.simTime * 60) {
            // Create new order
            const order = {
                id: orderId++,
                size: this.config.orderSize + Math.floor(Math.random() * 10 - 5), // ±5 variation
                arrivalTime: this.env.now,
                deadline: this.env.now + this.config.deadline * 60,
                parts: [],
                completed: false
            };
            
            this.stats.orders.push(order);
            this.stats.ordersTotal++;
            
            this.addLogEntry(`Order ${order.id} received: ${order.size} parts, deadline: ${(order.deadline/60).toFixed(1)}h`);
            
            // Start production for this order
            for (let i = 0; i < order.size; i++) {
                this.env.process(() => this.productionProcess(order, i + 1));
                yield new SimJS.Timeout(this.env, Math.random() * 2 + 1); // 1-3 min between parts
            }
            
            // Wait for next order
            const nextOrderTime = orderInterval + (Math.random() - 0.5) * orderInterval * 0.3;
            yield new SimJS.Timeout(this.env, nextOrderTime);
        }
    }
    
    * productionProcess(order, partNumber) {
        const partId = `${order.id}-${partNumber}`;
        const startTime = this.env.now;
        
        try {
            this.addLogEntry(`Part ${partId} enters production`);
            
            // Step 1: Material handling (forklift)
            const forkliftWaitStart = this.env.now;
            if (this.resources.forklifts.users.length >= this.resources.forklifts.capacity) {
                this.addLogEntry(`Part ${partId} waiting for forklift (${this.resources.forklifts.users.length}/${this.resources.forklifts.capacity} in use)`, 'waiting');
            }
            const forkliftRequest = this.resources.forklifts.request();
            yield forkliftRequest;
            const forkliftWaitTime = this.env.now - forkliftWaitStart;
            if (this.stats.resources && this.stats.resources.forklifts) {
                this.stats.resources.forklifts.totalRequests++;
                this.stats.resources.forklifts.waitingTime += forkliftWaitTime;
                this.stats.resources.forklifts.totalTime += forkliftWaitTime;
            }
            this.addLogEntry(`Part ${partId} forklift assigned`);
            
            const forkliftWorkTime = Math.random() * 5 + 2; // 2-7 min material handling
            yield new SimJS.Timeout(this.env, forkliftWorkTime);
            if (this.stats.resources && this.stats.resources.forklifts) {
                this.stats.resources.forklifts.totalTime += forkliftWorkTime;
            }
            this.resources.forklifts.release();
            
            // Step 2: CNC Machining
            const machineWaitStart = this.env.now;
            if (this.resources.machines.users.length >= this.resources.machines.capacity) {
                this.addLogEntry(`Part ${partId} waiting for CNC machine (${this.resources.machines.users.length}/${this.resources.machines.capacity} in use)`, 'waiting');
            }
            const machineRequest = this.resources.machines.request();
            yield machineRequest;
            const machineWaitTime = this.env.now - machineWaitStart;
            if (this.stats.resources && this.stats.resources.machines) {
                this.stats.resources.machines.totalRequests++;
                this.stats.resources.machines.waitingTime += machineWaitTime;
                this.stats.resources.machines.totalTime += machineWaitTime;
            }
            this.addLogEntry(`Part ${partId} CNC machine assigned`);
            
            // Check for machine breakdown (2% chance)
            if (Math.random() < 0.02) {
                this.addLogEntry(`Machine breakdown during part ${partId}!`, 'breakdown');
                this.stats.machineBreakdowns++;
                yield new SimJS.Timeout(this.env, 30 + Math.random() * 60); // 30-90 min repair
                this.addLogEntry(`Machine repaired, continuing part ${partId}`, 'success');
            }
            
            const machiningTime = 15 + Math.random() * 20; // 15-35 min
            yield new SimJS.Timeout(this.env, machiningTime);
            
            if (this.stats.resources && this.stats.resources.machines) {
                this.stats.resources.machines.totalTime += machiningTime;
            }
            
            this.resources.machines.release();
            
            // Step 3: Assembly
            const workerWaitStart = this.env.now;
            if (this.resources.workers.users.length >= this.resources.workers.capacity) {
                this.addLogEntry(`Part ${partId} waiting for assembly worker (${this.resources.workers.users.length}/${this.resources.workers.capacity} available)`, 'waiting');
            }
            const workerRequest = this.resources.workers.request();
            yield workerRequest;
            const workerWaitTime = this.env.now - workerWaitStart;
            if (this.stats.resources && this.stats.resources.workers) {
                this.stats.resources.workers.totalRequests++;
                this.stats.resources.workers.waitingTime += workerWaitTime;
                this.stats.resources.workers.totalTime += workerWaitTime;
            }
            this.addLogEntry(`Part ${partId} assembly worker assigned`);
            
            const assemblyTime = 10 + Math.random() * 15; // 10-25 min
            yield new SimJS.Timeout(this.env, assemblyTime);
            
            if (this.stats.resources && this.stats.resources.workers) {
                this.stats.resources.workers.totalTime += assemblyTime;
            }
            
            this.resources.workers.release();
            
            // Step 4: Quality Control
            const qcWaitStart = this.env.now;
            if (this.resources.qcInspectors.users.length >= this.resources.qcInspectors.capacity) {
                this.addLogEntry(`Part ${partId} waiting for QC inspector (${this.resources.qcInspectors.users.length}/${this.resources.qcInspectors.capacity} available)`, 'waiting');
            }
            const qcRequest = this.resources.qcInspectors.request();
            yield qcRequest;
            const qcWaitTime = this.env.now - qcWaitStart;
            if (this.stats.resources && this.stats.resources.qcInspectors) {
                this.stats.resources.qcInspectors.totalRequests++;
                this.stats.resources.qcInspectors.waitingTime += qcWaitTime;
                this.stats.resources.qcInspectors.totalTime += qcWaitTime;
            }
            this.addLogEntry(`Part ${partId} QC inspector assigned`);
            
            const inspectionTime = 5 + Math.random() * 10; // 5-15 min
            yield new SimJS.Timeout(this.env, inspectionTime);
            
            if (this.stats.resources && this.stats.resources.qcInspectors) {
                this.stats.resources.qcInspectors.totalTime += inspectionTime;
            }
            
            // Quality check (7% scrap rate)
            const isScrap = Math.random() < 0.07;
            this.resources.qcInspectors.release();
            
            if (isScrap) {
                this.stats.scrapParts++;
                this.addLogEntry(`Part ${partId} failed QC - scrapped`);
                return;
            }
            
            // Part completed successfully
            const cycleTime = this.env.now - startTime;
            this.stats.partsProduced++;
            this.stats.totalCycleTime += cycleTime;
            
            const part = {
                id: partId,
                completionTime: this.env.now,
                cycleTime: cycleTime,
                onTime: this.env.now <= order.deadline
            };
            
            order.parts.push(part);
            
            this.addLogEntry(`Part ${partId} completed in ${cycleTime.toFixed(1)} min`, 'success');
            
            // Check if order is complete
            if (order.parts.length === order.size - this.getScrapPartsForOrder(order)) {
                order.completed = true;
                order.completionTime = this.env.now;
                
                if (order.completionTime <= order.deadline) {
                    this.stats.onTimeDeliveries++;
                    this.addLogEntry(`Order ${order.id} completed ON TIME`, 'success');
                } else {
                    this.stats.lateDeliveries++;
                    const lateness = (order.completionTime - order.deadline) / 60;
                    this.addLogEntry(`Order ${order.id} completed LATE (${lateness.toFixed(1)}h)`, 'breakdown');
                }
                
                this.stats.ordersCompleted++;
            }
            
        } catch (error) {
            this.addLogEntry(`Production error for part ${partId}: ${error}`);
        }
    }
    
    * maintenanceProcess() {
        while (this.env.now < this.config.simTime * 60) {
            // Preventive maintenance every 8-12 hours
            yield new SimJS.Timeout(this.env, (8 + Math.random() * 4) * 60);
            
            if (this.env.now >= this.config.simTime * 60) break;
            
            this.addLogEntry(`Starting scheduled maintenance`);
            
            // Take one machine offline
            if (this.resources.machines.users.length >= this.resources.machines.capacity) {
                this.addLogEntry(`Maintenance crew waiting for CNC machine to become available`, 'waiting');
            }
            const maintenanceRequest = this.resources.machines.request();
            yield maintenanceRequest;
            this.addLogEntry(`CNC machine taken offline for maintenance`);
            
            const maintenanceTime = 60 + Math.random() * 120; // 1-3 hours
            yield new SimJS.Timeout(this.env, maintenanceTime);
            
            this.resources.machines.release();
            this.addLogEntry(`Maintenance completed`);
        }
    }
    
    * workerBreakProcess() {
        while (this.env.now < this.config.simTime * 60) {
            // Worker breaks every 4 hours
            yield new SimJS.Timeout(this.env, 4 * 60);
            
            if (this.env.now >= this.config.simTime * 60) break;
            
            // 30% of workers take break
            const workersOnBreak = Math.ceil(this.config.workers * 0.3);
            this.addLogEntry(`${workersOnBreak} workers taking break`);
            
            // Temporarily reduce worker capacity
            const originalCapacity = this.resources.workers.capacity;
            this.resources.workers.capacity = Math.max(1, originalCapacity - workersOnBreak);
            
            yield new SimJS.Timeout(this.env, 15 + Math.random() * 15); // 15-30 min break
            
            this.resources.workers.capacity = originalCapacity;
            this.addLogEntry(`Workers returned from break`);
        }
    }
    
    * monitoringProcess() {
        while (this.env.now < this.config.simTime * 60) {
            yield new SimJS.Timeout(this.env, 60); // Update every hour in simulation
            
            // Live updates are now handled by setInterval in startLiveSimulation()
            // This process just keeps the simulation monitoring alive
        }
    }
    
    startLiveSimulation() {
        const simTimeMinutes = this.config.simTime * 60;
        
        // Calculate interval based on speed (1-10 scale)
        // Speed 1 = 2000ms interval (slow), Speed 10 = 200ms interval (fast)
        const baseInterval = 2200 - (this.simulationSpeed * 200);
        
        this.simulationInterval = setInterval(() => {
            if (!this.isRunning || this.isPaused) return;
            
            try {
                // Run simulation in small steps (0.5 - 5 minutes based on speed)
                const stepSize = Math.min(this.simulationSpeed * 0.5, simTimeMinutes - this.env.now);
                
                if (stepSize <= 0 || this.env.now >= simTimeMinutes) {
                    this.completeSimulation();
                    return;
                }
                
                const targetTime = this.env.now + stepSize;
                this.env.run(targetTime);
                
            } catch (error) {
                if (error instanceof SimJS.StopSimulation || error.name === 'EmptySchedule') {
                    this.completeSimulation();
                } else {
                    console.error('Simulation error:', error);
                    this.stopSimulation();
                }
            }
        }, baseInterval);
        
        // Start live updates every 500ms
        this.updateInterval = setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.updateLiveMetrics();
                this.updateResourceMatrix();
            }
        }, 500);
    }
    
    updateSimulationSpeed() {
        const speedSlider = document.getElementById('speedControl');
        const speedDisplay = document.getElementById('speedValue');
        
        this.simulationSpeed = parseInt(speedSlider.value);
        speedDisplay.textContent = `${this.simulationSpeed}x ${this.getSpeedLabel()}`;
        
        // Restart intervals with new speed if simulation is running
        if (this.isRunning && !this.isPaused) {
            this.restartSimulationWithNewSpeed();
        }
    }
    
    getSpeedLabel() {
        if (this.simulationSpeed <= 3) return '(Slow)';
        if (this.simulationSpeed <= 7) return '(Normal)';
        return '(Fast)';
    }
    
    restartSimulationWithNewSpeed() {
        // Clear current intervals
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        // Restart with new speed
        const simTimeMinutes = this.config.simTime * 60;
        const baseInterval = 2200 - (this.simulationSpeed * 200);
        
        this.simulationInterval = setInterval(() => {
            if (!this.isRunning || this.isPaused) return;
            
            try {
                const stepSize = Math.min(this.simulationSpeed * 0.5, simTimeMinutes - this.env.now);
                
                if (stepSize <= 0 || this.env.now >= simTimeMinutes) {
                    this.completeSimulation();
                    return;
                }
                
                const targetTime = this.env.now + stepSize;
                this.env.run(targetTime);
                
            } catch (error) {
                if (error instanceof SimJS.StopSimulation || error.name === 'EmptySchedule') {
                    this.completeSimulation();
                } else {
                    console.error('Simulation error:', error);
                    this.stopSimulation();
                }
            }
        }, baseInterval);
    }
    
    updateLiveMetrics() {
        const currentTime = this.env && this.env.now !== undefined ? (this.env.now / 60).toFixed(1) : '0.0';
        document.getElementById('currentTime').textContent = currentTime;
        document.getElementById('partsProduced').textContent = this.stats.partsProduced;
        document.getElementById('ordersCompleted').textContent = this.stats.ordersCompleted;
        
        const onTimeRate = this.stats.ordersCompleted > 0 ? 
            (this.stats.onTimeDeliveries / this.stats.ordersCompleted * 100).toFixed(1) : 100;
        document.getElementById('onTimeDelivery').textContent = `${onTimeRate}%`;
        
        const totalParts = this.stats.partsProduced + this.stats.scrapParts;
        const scrapRate = totalParts > 0 ? (this.stats.scrapParts / totalParts * 100).toFixed(1) : 0;
        document.getElementById('scrapRate').textContent = `${scrapRate}%`;
        
        const avgCycleTime = this.stats.partsProduced > 0 ? 
            (this.stats.totalCycleTime / this.stats.partsProduced / 60).toFixed(2) : 0;
        document.getElementById('avgCycleTime').textContent = avgCycleTime;
    }
    
    updateResourceMatrix() {
        const resourceMatrix = document.getElementById('resourceMatrix');
        
        if (!resourceMatrix) return;
        
        // Update resource statistics
        this.updateResourceStats();
        
        const resourceConfigs = [
            {
                key: 'machines',
                name: 'CNC Machines',
                icon: 'M',
                resource: this.resources.machines,
                stats: this.stats.resources.machines,
                capacity: this.config.machines
            },
            {
                key: 'workers',
                name: 'Assembly Workers',
                icon: 'W',
                resource: this.resources.workers,
                stats: this.stats.resources.workers,
                capacity: this.config.workers
            },
            {
                key: 'forklifts',
                name: 'Forklifts',
                icon: 'F',
                resource: this.resources.forklifts,
                stats: this.stats.resources.forklifts,
                capacity: this.config.forklifts
            },
            {
                key: 'qcInspectors',
                name: 'QC Inspectors',
                icon: 'Q',
                resource: this.resources.qcInspectors,
                stats: this.stats.resources.qcInspectors,
                capacity: this.config.qcInspectors
            }
        ];
        
        resourceMatrix.innerHTML = resourceConfigs.map(config => {
            // Ensure resource and stats exist
            if (!config.resource || !config.stats) {
                return '';
            }
            
            const utilization = config.resource.users.length / config.resource.capacity * 100;
            const efficiency = config.stats.totalRequests > 0 && config.stats.totalTime > 0 ? 
                Math.max(0, Math.min(100, ((config.stats.totalTime - config.stats.waitingTime) / config.stats.totalTime * 100))) : 100;
            const avgWaitTime = config.stats.totalRequests > 0 ? 
                Math.max(0, config.stats.waitingTime / config.stats.totalRequests) : 0;
            const queueLength = config.resource.getQueue ? config.resource.getQueue.length : 0;
            
            return `
                <div class="card resource-panel">
                    <div class="card-header flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">${config.icon}</span>
                            <span class="font-semibold">${config.name}</span>
                        </div>
                        <div class="badge ${this.getUtilizationBadgeType(utilization)}">
                            ${utilization.toFixed(1)}%
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Utilization Bar -->
                        <div class="mb-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-medium">Current Utilization</span>
                                <span class="text-sm">${config.resource.users.length}/${config.capacity} active</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" 
                                     style="width: ${utilization}%; 
                                            background: ${this.getUtilizationColor(utilization)};"></div>
                            </div>
                        </div>
                        
                        <!-- Statistics Grid -->
                        <div class="grid-2 gap-3 text-sm">
                            <div class="stat-mini">
                                <div class="stat-mini-value">${config.stats.totalRequests}</div>
                                <div class="stat-mini-label">Total Requests</div>
                            </div>
                            <div class="stat-mini">
                                <div class="stat-mini-value">${queueLength}</div>
                                <div class="stat-mini-label">Queue Length</div>
                            </div>
                            <div class="stat-mini">
                                <div class="stat-mini-value">${avgWaitTime.toFixed(1)}m</div>
                                <div class="stat-mini-label">Avg Wait Time</div>
                            </div>
                            <div class="stat-mini">
                                <div class="stat-mini-value">${efficiency.toFixed(1)}%</div>
                                <div class="stat-mini-label">Efficiency</div>
                            </div>
                        </div>
                        
                        ${this.getResourceSpecificStats(config)}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateResourceStats() {
        // Ensure resource stats are initialized
        if (!this.stats || !this.stats.resources) {
            this.initializeResourceStats();
        }
        
        // Update current queue lengths and other real-time stats
        if (this.resources.machines && this.stats.resources.machines) {
            this.stats.resources.machines.queueLength = this.resources.machines.getQueue ? this.resources.machines.getQueue.length : 0;
            this.stats.resources.machines.breakdowns = this.stats.machineBreakdowns;
        }
        if (this.resources.workers && this.stats.resources.workers) {
            this.stats.resources.workers.queueLength = this.resources.workers.getQueue ? this.resources.workers.getQueue.length : 0;
        }
        if (this.resources.forklifts && this.stats.resources.forklifts) {
            this.stats.resources.forklifts.queueLength = this.resources.forklifts.getQueue ? this.resources.forklifts.getQueue.length : 0;
        }
        if (this.resources.qcInspectors && this.stats.resources.qcInspectors) {
            this.stats.resources.qcInspectors.queueLength = this.resources.qcInspectors.getQueue ? this.resources.qcInspectors.getQueue.length : 0;
            this.stats.resources.qcInspectors.rejections = this.stats.scrapParts;
        }
    }
    
    getResourceSpecificStats(config) {
        switch (config.key) {
            case 'machines':
                return `
                    <div class="border-t pt-3 mt-3">
                        <div class="flex items-center justify-between text-xs">
                            <span>Breakdowns:</span>
                            <span class="font-medium text-red">${config.stats.breakdowns}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs mt-1">
                            <span>Maintenance Due:</span>
                            <span class="font-medium">${this.getMaintenanceDue()}h</span>
                        </div>
                    </div>
                `;
            case 'workers':
                return `
                    <div class="border-t pt-3 mt-3">
                        <div class="flex items-center justify-between text-xs">
                            <span>Breaks Taken:</span>
                            <span class="font-medium">${Math.floor(this.env ? this.env.now / 240 : 0)}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs mt-1">
                            <span>Next Break:</span>
                            <span class="font-medium">${this.getNextBreakTime()}h</span>
                        </div>
                    </div>
                `;
            case 'forklifts':
                return `
                    <div class="border-t pt-3 mt-3">
                        <div class="flex items-center justify-between text-xs">
                            <span>Materials Moved:</span>
                            <span class="font-medium">${config.stats.totalRequests}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs mt-1">
                            <span>Speed:</span>
                            <span class="font-medium">${this.getForkliftSpeed()} parts/h</span>
                        </div>
                    </div>
                `;
            case 'qcInspectors':
                return `
                    <div class="border-t pt-3 mt-3">
                        <div class="flex items-center justify-between text-xs">
                            <span>Rejections:</span>
                            <span class="font-medium text-red">${config.stats.rejections}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs mt-1">
                            <span>Pass Rate:</span>
                            <span class="font-medium text-green">${this.getQCPassRate()}%</span>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }
    
    getUtilizationBadgeType(utilization) {
        if (utilization > 90) return 'badge-danger';
        if (utilization > 70) return 'badge-warning';
        if (utilization > 30) return 'badge-success';
        return 'badge-primary';
    }
    
    getMaintenanceDue() {
        if (!this.env) return 0;
        const lastMaintenance = Math.floor(this.env.now / 480) * 8; // Every 8 hours
        const nextMaintenance = lastMaintenance + 8;
        return Math.max(0, nextMaintenance - (this.env.now / 60)).toFixed(1);
    }
    
    getNextBreakTime() {
        if (!this.env) return 0;
        const lastBreak = Math.floor(this.env.now / 240) * 4; // Every 4 hours
        const nextBreak = lastBreak + 4;
        return Math.max(0, nextBreak - (this.env.now / 60)).toFixed(1);
    }
    
    getForkliftSpeed() {
        if (!this.env || this.env.now === 0) return 0;
        return (this.stats.resources.forklifts.totalRequests / (this.env.now / 60)).toFixed(1);
    }
    
    getQCPassRate() {
        const totalInspected = this.stats.partsProduced + this.stats.scrapParts;
        if (totalInspected === 0) return 100;
        return ((this.stats.partsProduced / totalInspected) * 100).toFixed(1);
    }
    
    getUtilizationColor(util) {
        if (util > 90) return '#ef4444'; // Red - overutilized
        if (util > 70) return '#f59e0b'; // Yellow - high utilization
        if (util > 30) return '#10b981'; // Green - good utilization
        return '#64748b'; // Gray - underutilized
    }
    
    completeSimulation() {
        this.isRunning = false;
        
        // Clear intervals
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.updateUI('complete');
        this.showResults();
        
        if (this.monitor) {
            this.monitor.stop();
        }
    }
    
    showResults() {
        document.getElementById('resultsSection').style.display = 'block';
        
        const performanceSummary = document.getElementById('performanceSummary');
        const recommendations = document.getElementById('recommendations');
        
        // Calculate final metrics
        const totalRuntime = this.config.simTime;
        const throughput = this.stats.partsProduced / totalRuntime;
        const onTimeRate = this.stats.ordersCompleted > 0 ? 
            (this.stats.onTimeDeliveries / this.stats.ordersCompleted * 100) : 0;
        const avgCycleTime = this.stats.partsProduced > 0 ? 
            (this.stats.totalCycleTime / this.stats.partsProduced / 60) : 0;
        const totalParts = this.stats.partsProduced + this.stats.scrapParts;
        const scrapRate = totalParts > 0 ? (this.stats.scrapParts / totalParts * 100) : 0;
        
        performanceSummary.innerHTML = `
            <div class="space-y-4">
                <div class="grid-2 gap-4">
                    <div class="stat-card">
                        <div class="stat-value text-blue">${this.stats.partsProduced}</div>
                        <div class="stat-label">Total Parts Produced</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value text-green">${this.stats.ordersCompleted}</div>
                        <div class="stat-label">Orders Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${onTimeRate >= 95 ? 'text-green' : onTimeRate >= 80 ? 'text-yellow' : 'text-red'}">${onTimeRate.toFixed(1)}%</div>
                        <div class="stat-label">On-Time Delivery</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${scrapRate <= 5 ? 'text-green' : scrapRate <= 10 ? 'text-yellow' : 'text-red'}">${scrapRate.toFixed(1)}%</div>
                        <div class="stat-label">Scrap Rate</div>
                    </div>
                </div>
                
                <div class="border-t pt-4">
                    <h4 class="font-semibold mb-3">Key Performance Indicators</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>Throughput:</span>
                            <span class="font-medium">${throughput.toFixed(1)} parts/hour</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Average Cycle Time:</span>
                            <span class="font-medium">${avgCycleTime.toFixed(2)} hours</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Machine Breakdowns:</span>
                            <span class="font-medium">${this.stats.machineBreakdowns}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Late Deliveries:</span>
                            <span class="font-medium">${this.stats.lateDeliveries}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Generate recommendations
        const recs = this.generateRecommendations(onTimeRate, scrapRate, throughput);
        recommendations.innerHTML = `
            <div class="space-y-4">
                <h4 class="font-semibold">Optimization Recommendations</h4>
                <div class="space-y-3">
                    ${recs.map(rec => `
                        <div class="alert alert-${rec.type} show">
                            <i class="bi bi-${rec.icon}"></i>
                            <div>
                                <div class="font-medium">${rec.title}</div>
                                <div class="text-sm">${rec.description}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }
    
    generateRecommendations(onTimeRate, scrapRate, throughput) {
        const recommendations = [];
        
        if (onTimeRate < 80) {
            recommendations.push({
                type: 'warning',
                icon: 'clock',
                title: 'Improve Delivery Performance',
                description: 'Consider adding more assembly workers or CNC machines to reduce cycle time.'
            });
        }
        
        if (scrapRate > 10) {
            recommendations.push({
                type: 'danger',
                icon: 'exclamation-triangle',
                title: 'High Scrap Rate',
                description: 'Add more quality control inspectors or implement better quality processes.'
            });
        }
        
        if (throughput < this.config.orderFrequency * this.config.orderSize / 2) {
            recommendations.push({
                type: 'info',
                icon: 'graph-up',
                title: 'Increase Throughput',
                description: 'Production capacity seems low. Consider optimizing resource allocation.'
            });
        }
        
        if (this.stats.machineBreakdowns > 2) {
            recommendations.push({
                type: 'warning',
                icon: 'tools',
                title: 'Reduce Machine Downtime',
                description: 'Implement more frequent preventive maintenance to reduce breakdowns.'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                icon: 'check-circle',
                title: 'Excellent Performance!',
                description: 'Your production system is well-optimized. Consider slight adjustments for even better results.'
            });
        }
        
        return recommendations;
    }
    
    getScrapPartsForOrder(order) {
        // Count scrap parts for this specific order (simplified)
        return Math.floor(order.size * 0.07);
    }
    
    addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('productionLog');
        if (logContainer) {
            const timestamp = this.env && this.env.now !== undefined ? 
                `[${(this.env.now / 60).toFixed(1)}h]` : '[0.0h]';
            const entry = document.createElement('div');
            entry.textContent = `${timestamp} ${message}`;
            entry.style.marginBottom = '2px';
            
            // Color code different types of messages
            if (type === 'waiting') {
                entry.style.color = '#f59e0b'; // Yellow for waiting
            } else if (type === 'breakdown') {
                entry.style.color = '#ef4444'; // Red for breakdowns
            } else if (type === 'success') {
                entry.style.color = '#10b981'; // Green for success
            }
            
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }
    
    pauseSimulation() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.isPaused) {
            pauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Resume';
            // Intervals continue running but are paused by the condition check
        } else {
            pauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
            // Intervals resume automatically when isPaused becomes false
        }
    }
    
    stopSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        
        // Clear intervals
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.updateUI('stop');
        
        if (this.monitor) {
            this.monitor.stop();
        }
    }
    
    resetSimulation() {
        this.stopSimulation();
        this.resetStats();
        this.updateUI('reset');
        
        // Clear displays
        document.getElementById('productionLog').innerHTML = '';
        document.getElementById('resourceMatrix').innerHTML = '';
        
        // Hide sections
        document.getElementById('metricsSection').style.display = 'none';
        document.getElementById('utilizationSection').style.display = 'none';
        document.getElementById('logSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        
        // Only add log entry if environment exists
        if (this.env) {
            this.addLogEntry('Simulation reset - ready for new run');
        }
    }
    
    resetStats() {
        this.stats = {
            partsProduced: 0,
            ordersCompleted: 0,
            ordersTotal: 0,
            scrapParts: 0,
            totalCycleTime: 0,
            onTimeDeliveries: 0,
            lateDeliveries: 0,
            machineBreakdowns: 0,
            totalWaitingTime: 0,
            waitingEvents: 0,
            orders: []
        };
        
        this.initializeResourceStats();
    }
    
    initializeResourceStats() {
        if (!this.stats) {
            this.stats = {};
        }
        
        this.stats.resources = {
            machines: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0, breakdowns: 0 },
            workers: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0, breaksTotal: 0 },
            forklifts: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0 },
            qcInspectors: { totalRequests: 0, totalTime: 0, waitingTime: 0, queueLength: 0, rejections: 0 }
        };
    }
    
    updateUI(state) {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        switch (state) {
            case 'start':
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
                
                document.getElementById('metricsSection').style.display = 'block';
                document.getElementById('utilizationSection').style.display = 'block';
                document.getElementById('logSection').style.display = 'block';
                break;
                
            case 'stop':
            case 'complete':
            case 'reset':
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = true;
                pauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
                break;
        }
    }
    

    
    showError(message) {
        console.error(message);
        // Could implement a proper error modal here
        alert(message);
    }
}

// Global functions for HTML event handlers
let simulator;

function startSimulation() {
    if (!simulator) {
        simulator = new ProductionSimulator();
    }
    simulator.startSimulation();
}

function pauseSimulation() {
    if (simulator) {
        simulator.pauseSimulation();
    }
}

function stopSimulation() {
    if (simulator) {
        simulator.stopSimulation();
    }
}

function resetSimulation() {
    if (simulator) {
        simulator.resetSimulation();
    }
}

function updateSimulationSpeed() {
    if (simulator) {
        simulator.updateSimulationSpeed();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    simulator = new ProductionSimulator();
}); 