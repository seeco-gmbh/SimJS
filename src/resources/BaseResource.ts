import { PutResource } from './PutResource.js';
import { GetResource } from './GetResource.js';
import { Environment } from '../events/Event.js';

export abstract class BaseResource {
    public env: Environment;
    public capacity: number;
    public putQueue: PutResource[];
    public getQueue: GetResource[];

    constructor(env: Environment, capacity: number) {
        this.env = env;
        this.capacity = capacity;
        this.putQueue = [];
        this.getQueue = [];
    }

    put(amount: number): PutResource {
        return new PutResource(this, amount);
    }

    get(amount: number): GetResource {
        return new GetResource(this, amount);
    }

    protected abstract _doPut(event: PutResource): boolean;

    public _triggerPut(getEvent: GetResource | null = null): void {
        let idx = 0;
        while (idx < this.putQueue.length) {
            const putEvent = this.putQueue[idx];
            const proceed = this._doPut(putEvent);
            if (putEvent.triggered) {
                this.putQueue.splice(idx, 1);
            } else {
                idx += 1;
            }

            if (!proceed) {
                break;
            }
        }
    }

    protected abstract _doGet(event: GetResource): boolean;

    public _triggerGet(putEvent: PutResource | null = null): void {
        let idx = 0;
        while (idx < this.getQueue.length) {
            const getEvent = this.getQueue[idx];
            const proceed = this._doGet(getEvent);
            if (getEvent.triggered) {
                this.getQueue.splice(idx, 1);
            } else {
                idx += 1;
            }

            if (!proceed) {
                break;
            }
        }
    }
} 