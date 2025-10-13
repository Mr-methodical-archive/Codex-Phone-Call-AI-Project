export class BoundedQueue<T> {
  private buffer: T[] = [];

  constructor(private readonly maxSize: number) {
    if (maxSize <= 0) throw new Error('maxSize must be greater than 0');
  }

  push(item: T) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  drain(): T[] {
    const copy = [...this.buffer];
    this.buffer.length = 0;
    return copy;
  }

  size() {
    return this.buffer.length;
  }
}
