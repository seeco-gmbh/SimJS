import { BaseResource } from './BaseResource.js';
import { GetResource } from './GetResource.js';
import { PutResource } from './PutResource.js';
import { Environment } from '../events/Event.js';

export class Resource extends BaseResource {
    public users: number[];

    constructor(env: Environment, capacity: number = 1) {
        if (capacity <= 0) {
            throw new Error('"capacity" must be > 0.');
        }
        super(env, capacity);
        this.users = [];
    }

    request(amount: number = 1): GetResource {
        return new GetResource(this, amount); 
    }

    release(amount: number = 1): PutResource {
        return new PutResource(this, amount);
    }

    protected _doGet(event: GetResource): boolean {
        const available = this.capacity - this.users.length;
        if (available >= event.amount) {
            for (let i = 0; i < event.amount; i++) {
                this.users.push(1);
            }
            event.succeed();
            return true;
        }
        return false;
    }

    protected _doPut(event: PutResource): boolean {
        if (this.users.length >= event.amount) {
            for (let i = 0; i < event.amount; i++) {
                this.users.pop(); 
            }
            event.succeed();
            return true;
        }
        return false;
    }
} 