import { Heap } from './Heap.js';
import { EmptySchedule } from '../errors/EmptySchedule.js';
import { Process } from '../events/Process.js';
import { StopSimulation } from '../errors/StopSimulation.js';
import { Event } from '../events/Event.js';
import { QueueItem, Priority, GeneratorFunction } from '../types.js';

export class Environment {
    private _now: number;
    private _queue: Heap<QueueItem>;
    private _eid: number;
    public activeProcess: Process | null;

    constructor(initialTime: number = 0) {
        this._now = initialTime;
        this._queue = new Heap<QueueItem>((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.eid - b.eid;
        });
        this._eid = 0;
        this.activeProcess = null;
    }

    get now(): number {
        return this._now;
    }

    schedule(event: Event, priority: Priority = 'NORMAL', delay: number = 0): void {
        const scheduledTime = this._now + delay;
        this._queue.push({
            time: scheduledTime,
            priority: priority === 'URGENT' ? 0 : 1,
            eid: this._eid++,
            event: event
        });
        event._scheduled = true;
    }

    peek(): number {
        if (this._queue.size() === 0) return Infinity;
        const item = this._queue.peek();
        return item ? item.time : Infinity;
    }

    step(): void {
        if (this._queue.size() === 0) {
            throw new EmptySchedule();
        }
    
        const queueItem = this._queue.pop();
        if (!queueItem) return;
        
        const { time, event } = queueItem;
        this._now = time;
    
        if (!event || !Array.isArray(event.callbacks)) {
            return;
        }
    
        try {
            for (const callback of event.callbacks) {
                if (typeof callback === 'function') {
                    callback(event);
                }
            }
        } catch (e) {
            throw e;
        }
    
        if (!event._ok && !event._defused) {
            throw event._value;
        }
    }

    run(until: number | Event | null = null): void {
        if (until !== null) {
            if (typeof until !== 'number' && !(until instanceof Event)) {
                throw new Error('Invalid "until" argument');
            }

            if (typeof until !== 'number') {
                until.callbacks!.push(StopSimulation.callback);
            }
        }

        try {
            while (this._queue.size() > 0) {
                this.step();
            }
        } catch (e) {
            throw e;
        }
    }

    process(generatorFunction: GeneratorFunction): Process {
        const process = new Process(this, generatorFunction);
        return process;
    }
} 