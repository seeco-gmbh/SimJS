import { Event } from '../events/Event.js';
import { BaseResource } from './BaseResource.js';
import { Process } from '../events/Process.js';

export class PutResource extends Event {
    public resource: BaseResource;
    public amount: number;
    public proc: Process | null;

    constructor(resource: BaseResource, amount: number) {
        super(resource.env);
        if (amount <= 0) {
            throw new Error(`Amount (${amount}) must be > 0.`);
        }
        this.resource = resource;
        this.amount = amount;
        this.proc = (this.env as any).activeProcess;
        this.resource.putQueue.push(this);
        this.callbacks!.push(this.resource._triggerGet.bind(this.resource) as any);
        this.resource._triggerPut();
    }

    cancel(): void {
        if (!this.triggered) {
            const index = this.resource.putQueue.indexOf(this);
            if (index > -1) {
                this.resource.putQueue.splice(index, 1);
            }
        }
    }
} 