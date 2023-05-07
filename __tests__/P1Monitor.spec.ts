import { P1Monitor, P1Parser }   from '../src';
import { SerialPortMock }        from 'serialport';
import { MockBinding }           from '@serialport/binding-mock';
import * as fs                   from 'fs';
import { ChecksumMismatchError } from '../src/ChecksumMismatchError';

MockBinding.createPort('/dev/TEST', { echo: false, record: false });
const mock = new SerialPortMock({
    path: '/dev/TEST',
    baudRate: 115200,
});

jest.mock('serialport', () => ({
    ...jest.requireActual('serialport'),
    SerialPort: jest.fn().mockImplementation(() => mock),
}));

const parser = new P1Parser({ timezone: 'Europe/Amsterdam', withUnits: false });
const parseSpy = jest.spyOn(parser, 'parse');

const monitor = new P1Monitor(parser, {
    path: '/dev/TEST',
    baudRate: 115200,
    packet: { startChar: '/', stopChar: '!' },
});

const emitSpy = jest.spyOn(monitor, 'emit');
afterEach(() => {
    parseSpy.mockClear();
    emitSpy.mockClear();
});

describe('Data handling', () => {
    it('can handle a DSMR 4.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr4.txt');

        mock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledWith('data', expect.objectContaining({
            vendorId: 'ISk',
            modelId: '2MT382-1 000',
        }));
        expect(emitSpy).toBeCalledTimes(1);
    });

    it('can handle a DSMR 5.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/esmr5.txt');

        mock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        // expect(emitSpy).toBeCalledWith('data', expect.objectContaining({
        //     vendorId: 'Ene',
        //     modelId: 'T210-D ESMR5.0',
        // }));
        expect(emitSpy).toBeCalledTimes(1);
    });

    it('can handle a lot of small chunks at once', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        let i = 0;
        while (i <= data.length) {
            const packet = data.subarray(i, i += 4);
            mock.emit('data', packet);
        }

        const parsed = {};
        // parseSpy.mockImplementation((): P1Packet => {
        //     return parsed;
        // });

        expect(parseSpy).toBeCalledTimes(14);
        expect(emitSpy).toBeCalledWith('data', parsed);
        expect(emitSpy).toBeCalledTimes(14);
    });

    it('can handle a buffer containing multiple packets', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        mock.emit('data', data);

        const parsed = {};
        // parseSpy.mockImplementation((): P1Packet => {
        //     return parsed;
        // });

        expect(parseSpy).toBeCalledTimes(14);
        expect(emitSpy).toBeCalledWith('data', parsed);
        expect(emitSpy).toBeCalledTimes(14);
    });

    it('can handle data starting mid-message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/stop-character-at-start.txt');

        mock.emit('data', data);

        let i = 0;
        while (i <= data.length) {
            mock.emit('data', data.subarray(i, i += 4));
        }

        const parsed = {};
        // parseSpy.mockImplementation((): P1Packet => {
        //     return parsed;
        // });

        expect(parseSpy).toBeCalledTimes(4);
        expect(emitSpy).toBeCalledWith('data', parsed);
        expect(emitSpy).toBeCalledTimes(4);
    });

    it('emits an error event when the checksums mismatch', () => {
        const noop = () => void 0;
        monitor.on('error', noop);

        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/invalid-checksum.txt');

        mock.emit('data', data);

        expect(emitSpy).toBeCalledWith('error', expect.any(ChecksumMismatchError));
        expect(emitSpy).toBeCalledTimes(1);

        monitor.off('error', noop);
    });
});

describe('Event handling', () => {
    it('re-emits error events from the serial port', () => {
        const noop = () => void 0;
        monitor.on('error', noop);

        mock.emit('error', new Error('Some error.'));

        expect(emitSpy).toBeCalledWith('error', expect.any(Error));

        monitor.off('error', noop);
    });

    it('re-emits close events from the serial port', () => {
        mock.emit('close');
        expect(emitSpy).toBeCalledWith('close', undefined);

        mock.emit('close', new Error('Some error.'));
        expect(emitSpy).toBeCalledWith('close', expect.any(Error));
    });
});
