/**
 * Assigns the given value to the object at the given path.
 *
 * The different object keys in the path should be separated by a dot.
 *
 * TODO: Consider using lodash _.set() @see {https://lodash.com/docs/4.17.15#set}
 */
export function AssignNestedValue(object: object, path: string, value: unknown)
{
    // Contains a moving reference to internal objects within the given object.
    let schema = object;

    const parts  = path.split('.');
    const length = parts.length;

    // Loop over all the parts in the path.
    for(let i = 0; i < length - 1; i++) {
        const elem = parts[i];

        if (typeof schema[elem] === 'undefined') {
            schema[elem] = {};
        }

        // Point to the element in the object.
        schema = schema[elem];
    }

    // Assign the value to the object.
    schema[parts[length-1]] = value;
}
