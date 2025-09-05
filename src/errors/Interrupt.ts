export class Interrupt extends Error {
    public cause: any;

    constructor(cause: any = null) {
        super(`Interrupt(${cause})`);
        this.cause = cause;
        this.name = 'Interrupt';
    }

    toString(): string {
        return `${this.name}: ${this.cause}`;
    }
} 