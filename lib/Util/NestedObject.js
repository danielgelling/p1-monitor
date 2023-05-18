"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedObject2 = exports.NestedObject = void 0;
function NestedObject(object, path, value) {
    let schema = object; // a moving reference to internal objects within obj
    const parts = path.split('.');
    const length = parts.length;
    for (let i = 0; i < length - 1; i++) {
        const elem = parts[i];
        if (typeof schema[elem] === 'undefined') {
            schema[elem] = {};
        }
        schema = schema[elem];
    }
    schema[parts[length - 1]] = value;
}
exports.NestedObject = NestedObject;
function NestedObject2(object, path, value) {
    let schema = object; // a moving reference to internal objects within obj
    const parts = path.split('.').slice(0, -1);
    const length = parts.length;
    for (const part of parts) {
        if (typeof schema[part] === 'undefined') {
            schema[part] = {};
        }
        schema = schema[part];
    }
    schema[parts[length - 1]] = value;
}
exports.NestedObject2 = NestedObject2;
//# sourceMappingURL=NestedObject.js.map