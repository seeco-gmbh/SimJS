import { Event, Environment } from './Event.js';
import { Process } from './Process.js';

export class Initialize extends Event {
    constructor(env: Environment, process: Process) {
        super(env);
        this.callbacks = [process._resume.bind(process)];
        this._ok = true;
        env.schedule(this, 'URGENT');
    }
} 