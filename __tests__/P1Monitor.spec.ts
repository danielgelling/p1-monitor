import { P1Monitor }             from '../src';
import { SerialPortMock }        from 'serialport';
import { MockBinding }           from '@serialport/binding-mock';
import * as fs                   from 'fs';
import { ChecksumMismatchError } from '../src/ChecksumMismatchError';

MockBinding.createPort('/dev/TEST', { echo: false, record: false });
const mock = new SerialPortMock({
    path: '/dev/TEST',
    baudRate: 115200,
});

jest.mock('serialport', () => {
    return {
        ...jest.requireActual('serialport'),
        SerialPort: jest.fn().mockImplementation(() => mock),
    };
});

const monitor = new P1Monitor({
    path: '/dev/TEST',
    baudRate: 115200,
    packet: { startChar: '/', stopChar: '!' },
});

// Listen to error events, as not to have node throw the error instead.
monitor.on('error', () => void 0);

const spy = jest.spyOn(monitor, 'emit');
afterEach(spy.mockClear);

describe('Data handling', () => {
    it('can handle a lot of small chunks at once', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        let i = 0;
        while (i <= data.length) {
            mock.emit('data', data.subarray(i, i += 4));
        }

        expect(spy).toBeCalledTimes(14);
    });

    it('can handle a buffer containing multiple packets', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        mock.emit('data', data);

        expect(spy).toBeCalledTimes(14);
    });

    it('can handle data starting mid-message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/stop-character-at-start.txt');

        mock.emit('data', data);

        let i = 0;
        while (i <= data.length) {
            mock.emit('data', data.subarray(i, i += 4));
        }

        expect(spy).toBeCalledTimes(4);
    });

    it('emits an error event when the checksums mismatch', () =>{
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/invalid-checksum.txt');

        mock.emit('data', data);

        expect(spy).toBeCalledWith('error', expect.any(ChecksumMismatchError));
    });
});

describe('Event handling', () => {
    it('re-emits error events from the serial port', () => {
        mock.emit('error', new Error('Some error.'));

        expect(spy).toBeCalledWith('error', expect.any(Error));
    });

    it('re-emits close events from the serial port', () => {
        mock.emit('close');
        expect(spy).toBeCalledWith('close', undefined);

        mock.emit('close', new Error('Some error.'));
        expect(spy).toBeCalledWith('close', expect.any(Error));
    });
});
