import { Interrupt } from '../../src/SimJS.js';

describe('Interrupt', () => {
  test('should create an interrupt with default cause', () => {
    const interrupt = new Interrupt();
    expect(interrupt.message).toBe('Interrupt(null)');
    expect(interrupt.cause).toBeNull();
    expect(interrupt.name).toBe('Interrupt');
  });

  test('should create an interrupt with a specific cause', () => {
    const cause = new Error('Cause of interrupt');
    const interrupt = new Interrupt(cause);
    expect(interrupt.message).toBe(`Interrupt(${cause})`);
    expect(interrupt.cause).toBe(cause);
    expect(interrupt.name).toBe('Interrupt');
  });

  test('toString method should return correct string', () => {
    const cause = 'Some cause';
    const interrupt = new Interrupt(cause);
    expect(interrupt.toString()).toBe(`Interrupt: ${cause}`);
  });
}); 