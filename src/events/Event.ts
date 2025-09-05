import { ConditionValue } from '../core/ConditionValue.js';
import { EventStatus } from '../types.js';

// Forward declaration to avoid circular dependency
export interface Environment {
    schedule(event: Event, priority?: string, delay?: number): void;
}

// Type definitions specific to Event
export type EventCallback = (event?: any) => void;
export type ConditionEvaluator = (events: Event[], count: number) => boolean;

export class Event {
    public env: Environment;
    public callbacks: EventCallback[] | null;
    public _ok: boolean | undefined;
    public _defused: boolean;
    public _value: EventStatus;
    public _scheduled?: boolean;

    // Condition related properties
    private _evaluate: ConditionEvaluator | null;
    private _events: Event[];
    private _count: number;

    constructor(env: Environment, evaluate: ConditionEvaluator | null = null, events: Event[] = []) {
        this.env = env;
        this.callbacks = [];
        this._ok = undefined;
        this._defused = false;
        this._value = 'PENDING';

        // Condition related properties
        this._evaluate = evaluate;
        this._events = Array.from(events);
        this._count = 0;

        // Handle condition logic if events are provided
        if (this._events.length > 0) {
            this._initializeCondition();
        }
    }

    private _initializeCondition(): void {
        for (let event of this._events) {
            if (event.env !== this.env) {
                throw new Error('Mixing events from different environments is not allowed');
            }

            if (event.callbacks === null) {
                this._check(event);
            } else {
                event.callbacks.push(this._check.bind(this));
            }
        }

        this.callbacks!.push(this._buildValue.bind(this));
    }

    get triggered(): boolean {
        return this._value !== 'PENDING';
    }

    get processed(): boolean {
        return this.callbacks === null;
    }

    get ok(): boolean {
        if (!this.triggered) {
            throw new Error(`Value of ${this} is not yet available`);
        }
        return this._ok!;
    }

    get defused(): boolean {
        return this._defused;
    }

    set defused(value: boolean) {
        this._defused = value;
    }

    get value(): any {
        if (this._value === 'PENDING') {
            throw new Error(`Value of ${this} is not yet available`);
        }
        return this._value;
    }

    trigger(event: Event): void {
        this._ok = event._ok;
        this._value = event._value;
        if (!this._scheduled){ 
            this.env.schedule(this);
            this._scheduled = true;
        }
    }

    succeed(value: any = null): this {
        if (this._value !== 'PENDING') {
            throw new Error(`${this} has already been triggered`);
        }
        this._ok = true;
        this._value = value;
        if (!this._scheduled) { 
            this.env.schedule(this);
            this._scheduled = true; 
        }
        return this;
    }

    fail(exception: Error): this {
        if (this._value !== 'PENDING') {
            throw new Error(`${this} has already been triggered`);
        }
        if (!(exception instanceof Error)) {
            throw new TypeError(`${exception} is not an exception.`);
        }
        this._ok = false;
        this._value = exception;
        if (!this._scheduled) {
            this.env.schedule(this);
            this._scheduled = true; 
        }
        return this;
    }

    and(other: Event): Event {
        return new Event(this.env, Event.allEvents, [this, other]);
    }

    or(other: Event): Event {
        return new Event(this.env, Event.anyEvents, [this, other]);
    }

    // Condition related methods
    private _check(event: Event): void {
        if (this._value !== 'PENDING') return;

        this._count += 1;

        if (!event._ok) {
            event._defused = true;
            this.fail(event._value as Error);
        } else if (this._evaluate!(this._events, this._count)) {
            this.succeed(new ConditionValue());
        }
    }

    private _buildValue(event: Event): void {
        this._removeCheckCallbacks();
        if (event._ok) {
            this._value = new ConditionValue();
            this._populateValue(this._value as ConditionValue);
        }
    }

    private _populateValue(value: ConditionValue): void {
        for (let event of this._events) {
            if (event.callbacks === null) {
                value.events.push(event);
            }
        }
    }

    private _removeCheckCallbacks(): void {
        for (let event of this._events) {
            if (event.callbacks && event.callbacks.includes(this._check.bind(this))) {
                event.callbacks = event.callbacks.filter(cb => cb !== this._check.bind(this));
            }
        }
    }

    protected _desc(): string {
        if (this._evaluate) {
            return `${this.constructor.name}(${this._evaluate.name}, ${this._events})`;
        }
        return `${this.constructor.name}()`;
    }

    toString(): string {
        return `<${this._desc()} object>`;
    }

    static allEvents(events: Event[], count: number): boolean {
        return events.length === count;
    }

    static anyEvents(events: Event[], count: number): boolean {
        return count > 0 || events.length === 0;
    }
} 