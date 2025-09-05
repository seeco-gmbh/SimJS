import { Event, Environment } from './Event.js';
import { Initialize } from './Initialize.js';
import { Interrupt } from '../errors/Interrupt.js';
import { GeneratorFunction } from '../types.js';

export class Process extends Event {
    private _generator: Generator<any, any, any>;
    private _target: Initialize;

    constructor(env: Environment, generator: GeneratorFunction) {
        super(env);
        const gen = generator();
        if (typeof gen.throw !== 'function') {
            throw new Error(`${generator} is not a generator.`);
        }
        this._generator = gen;
        this._target = new Initialize(env, this);
    }

    get name(): string {
        return this._generator.constructor.name || 'anonymous';
    }

    get isAlive(): boolean {
        return this._value === 'PENDING';
    }

    interrupt(cause: any = null): void {
        if (this.isAlive) {
            this._ok = false;
            this._value = new Interrupt(cause).toString();
            this.env.schedule(this);
        }
    }

    public _resume(event: Event): void {
        (this.env as any).activeProcess = this;
        let nextEvent: Event | null = event;
        try {
            while (nextEvent !== null) {
                if (nextEvent._ok) {
                    const result = this._generator.next(nextEvent._value);
                    if (result.done) {
                        this._ok = true;
                        this._value = result.value;
                        break;
                    } else {
                        nextEvent = result.value;
                    }
                } else {
                    const result = this._generator.throw(nextEvent._value);
                    if (result.done) {
                        this._ok = true;
                        this._value = result.value;
                        break;
                    } else {
                        nextEvent = result.value;
                    }
                }

                if (nextEvent instanceof Event) {
                    if (nextEvent.callbacks !== null) {
                        nextEvent.callbacks.push(this._resume.bind(this));
                        break;
                    }
                } else {
                    throw new Error(`Invalid Yield value "${nextEvent}"`);
                }
            }

            if (nextEvent === null) {
                this._ok = true;
                this._value = this._generator.return ? this._generator.return(undefined).value : null;
            }
        } catch (e) {
            this._ok = false;
            this._value = e;
            this.env.schedule(this);
        } finally {
            (this.env as any).activeProcess = null;
        }
    }
} 