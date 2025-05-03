
/**
 * Simple rate limiter for webhook calls
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private calls: Map<string, RateLimitRecord>;
  private limit: number;
  private timeWindow: number;

  constructor(limit: number = 10, timeWindow: number = 60 * 1000) {
    this.calls = new Map<string, RateLimitRecord>();
    this.limit = limit;
    this.timeWindow = timeWindow;
  }

  /**
   * Check if a key has exceeded its rate limit
   */
  checkLimit(key: string): boolean {
    const now = Date.now();
    const record = this.calls.get(key);
    
    // If no record exists or the time window has passed, create/reset the record
    if (!record || now > record.resetTime) {
      this.calls.set(key, { count: 1, resetTime: now + this.timeWindow });
      return true;
    }
    
    // Check if limit is reached
    if (record.count >= this.limit) {
      return false;
    }
    
    // Update call count
    record.count++;
    return true;
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.calls.clear();
  }
}

export const webhookRateLimiter = new RateLimiter();
