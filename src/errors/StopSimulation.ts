import { Event } from '../events/Event.js';

export class StopSimulation extends Error {
    public event: any;

    constructor(event: any) {
        super('StopSimulation');
        this.event = event;
        this.name = 'StopSimulation';
    }

    static callback(event: Event): void {
        if (event.ok) {
            throw new StopSimulation(event.value);
        } else {
            throw event._value;
        }
    }

    toString(): string {
        return `${this.name}(${this.event})`;
    }
} 