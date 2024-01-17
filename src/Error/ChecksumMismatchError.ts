export class ChecksumMismatchError extends Error
{
    constructor(
        public readonly expected: number,
        public readonly actual: number,
    ) {
        super(`Checksum mismatch. Expected: ${expected}. Got: ${actual}.`);
    }
}
