export declare class ChecksumMismatchError extends Error {
    readonly expected: number;
    readonly actual: number;
    constructor(expected: number, actual: number);
}
