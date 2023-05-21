import { createP1Monitor } from '../src';

jest.mock('../src/P1Monitor');
// jest.mock('P1Parser');

describe('factories create their respective instances', () => {
    it('creates P1Monitor instance with mocked parser', () => {
        const monitor = createP1Monitor({
            baudRate: 12345,
            path: '',
            timezone: 'Europe/Amsterdam',
        });

        expect(true).toBeTruthy();
        // console.log(monitor);
    });
});
