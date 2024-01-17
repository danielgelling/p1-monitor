"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutExceededError = void 0;
class TimeoutExceededError extends Error {
    constructor(timeout) {
        super(`Timeout of ${timeout}ms exceeded.`);
    }
}
exports.TimeoutExceededError = TimeoutExceededError;
//# sourceMappingURL=TimeoutExceededError.js.map