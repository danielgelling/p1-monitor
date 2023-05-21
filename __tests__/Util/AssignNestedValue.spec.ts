import { AssignNestedValue } from '../../src/Util/AssignNestedValue';

describe('Value assignment', () => {
    it('adds the given value at the correct path', () => {
        const initialObject = {
            hello: 'world',
            some: {
                cool: {
                    thing: 'that already exists',
                },
            },
        };

        AssignNestedValue(initialObject, 'some.cool.path', 'to success');
        AssignNestedValue(initialObject, 'some.uncool.path', 'to failure');

        expect(initialObject).toEqual({
            hello: 'world',
            some: {
                cool: {
                    path: 'to success',
                    thing: 'that already exists',
                },
                uncool: {
                    path: 'to failure',
                },
            },
        });
    });
});
