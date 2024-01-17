export class TimeoutExceededError extends Error
{
    constructor(timeout: number) {
        super(`Timeout of ${timeout}ms exceeded.`);
    }
}
