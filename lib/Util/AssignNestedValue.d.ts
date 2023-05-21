/**
 * Assigns the given value to the object at the given path.
 *
 * The different object keys in the path should be separated by a dot.
 *
 * TODO: Consider using lodash _.set() @see {https://lodash.com/docs/4.17.15#set}
 */
export declare function AssignNestedValue(object: object, path: string, value: unknown): void;
