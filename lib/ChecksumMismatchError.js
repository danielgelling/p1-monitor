"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecksumMismatchError = void 0;
class ChecksumMismatchError extends Error {
    constructor(expected, actual) {
        super(`Checksum mismatch. Expected: ${expected}. Got: ${actual}.`);
        this.expected = expected;
        this.actual = actual;
    }
}
exports.ChecksumMismatchError = ChecksumMismatchError;
//# sourceMappingURL=ChecksumMismatchError.js.map