import { Event, Environment } from './Event.js';

export class Timeout extends Event {
    private _delay: number;

    constructor(env: Environment, delay: number = 0, value: any = null) {
        super(env);
        if (delay < 0) {
            throw new Error(`Negative delay value: ${delay}`);
        }
        this._delay = delay;
        this._ok = true;
        this._value = value;
        env.schedule(this as any, 'NORMAL', delay);
    }

    protected _desc(): string {
        const valueStr = this._value === null ? '' : `, Value=${this.value}`;
        return `${this.constructor.name}(${this._delay}${valueStr})`;
    }
} 