export class Throttle {
  private calls: number[] = [];
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < this.windowMs);
    if (this.calls.length < this.limit) {
      this.calls.push(now);
      return;
    }
    const oldest = this.calls[0];
    const wait = this.windowMs - (now - oldest) + 1;
    await new Promise((r) => setTimeout(r, wait));
    return this.acquire();
  }
}
