import { EmptySchedule, Event, Environment } from '../../src/SimJS.js';

describe('EmptySchedule', () => {
  test('should create EmptySchedule error', () => {
    const emptySchedule = new EmptySchedule();
    expect(emptySchedule.message).toBe('EmptySchedule');
    expect(emptySchedule.name).toBe('EmptySchedule');
  });
}); 