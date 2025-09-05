import { Heap } from '../../src/SimJS.js';

describe('Heap', () => {
  test('should initialize correctly', () => {
    const heap = new Heap<number>((a, b) => a - b);
    expect(heap.size()).toBe(0);
    expect(heap.peek()).toBeUndefined();
  });

  test('should push and peek correctly', () => {
    const heap = new Heap<number>((a, b) => a - b);
    heap.push(5);
    heap.push(3);
    heap.push(4);
    expect(heap.peek()).toBe(3);
  });

  test('should pop elements in correct order', () => {
    const heap = new Heap<number>((a, b) => a - b);
    heap.push(5);
    heap.push(3);
    heap.push(4);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(4);
    expect(heap.pop()).toBe(5);
    expect(heap.pop()).toBeNull();
  });

  test('should handle custom comparison', () => {
    const heap = new Heap<number>((a, b) => b - a); // Max-Heap
    heap.push(1);
    heap.push(3);
    heap.push(2);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(1);
  });

  test('should maintain heap property after multiple operations', () => {
    const heap = new Heap<number>((a, b) => a - b);
    const numbers = [10, 4, 15, 20, 0, 8];
    numbers.forEach(num => heap.push(num));
    const sorted: number[] = [];
    while (heap.size() > 0) {
      sorted.push(heap.pop()!);
    }
    expect(sorted).toEqual([0, 4, 8, 10, 15, 20]);
  });
}); 