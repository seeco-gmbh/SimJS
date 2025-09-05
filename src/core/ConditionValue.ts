import { Event } from '../events/Event.js';

export class ConditionValue {
    public events: Event[];

    constructor() {
        this.events = [];
    }

    get(item: Event): any {
        if (!this.has(item)) {
            throw new Error(`Key ${item} not found`);
        }
        return item._value;
    }

    has(item: Event): boolean {
        return this.events.includes(item);
    }

    [Symbol.iterator](): Iterator<Event> {
        return this.events[Symbol.iterator]();
    }

    keys(): IterableIterator<Event> {
        return this.events.values();
    }

    values(): any[] {
        return this.events.map(event => event._value);
    }

    entries(): [Event, any][] {
        return this.events.map(event => [event, event._value]);
    }

    toDict(): Record<string, any> {
        return this.events.reduce((dict: Record<string, any>, event) => {
            dict[event.toString()] = event._value;
            return dict;
        }, {});
    }

    toString(): string {
        return `<ConditionValue ${JSON.stringify(this.toDict())}>`;
    }
} 