import { Comparator } from '../types.js';

export class Heap<T> {
    private compare: Comparator<T>;
    private items: T[];

    constructor(compare: Comparator<T>) {
        this.compare = compare;
        this.items = [];
    }

    size(): number {
        return this.items.length;
    }

    peek(): T | undefined {
        return this.items[0];
    }

    push(item: T): void {
        this.items.push(item);
        this._heapifyUp();
    }

    pop(): T | null {
        if (this.size() === 0) return null;
        const top = this.peek()!;
        const bottom = this.items.pop()!;
        if (this.size() > 0) {
            this.items[0] = bottom;
            this._heapifyDown();
        }
        return top;
    }

    private _heapifyUp(): void {
        let idx = this.size() - 1;
        const item = this.items[idx];

        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            const parent = this.items[parentIdx];
            if (this.compare(item, parent) >= 0) break;
            this.items[parentIdx] = item;
            this.items[idx] = parent;
            idx = parentIdx;
        }
    }

    private _heapifyDown(): void {
        let idx = 0;
        const length = this.size();
        const item = this.items[0];

        while (true) {
            let leftIdx = 2 * idx + 1;
            let rightIdx = 2 * idx + 2;
            let smallest = idx;

            if (leftIdx < length && this.compare(this.items[leftIdx], this.items[smallest]) < 0) {
                smallest = leftIdx;
            }

            if (rightIdx < length && this.compare(this.items[rightIdx], this.items[smallest]) < 0) {
                smallest = rightIdx;
            }

            if (smallest === idx) break;

            this.items[idx] = this.items[smallest];
            this.items[smallest] = item;
            idx = smallest;
        }
    }
} 