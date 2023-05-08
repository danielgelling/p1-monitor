import { P1Monitor }             from '../src';
import { SerialPortMock }        from 'serialport';
import { MockBinding }           from '@serialport/binding-mock';
import * as fs                   from 'fs';
import { P1ParserMock }          from './__mocks__/P1ParserMock';
import { ChecksumMismatchError } from '../src/ChecksumMismatchError';

MockBinding.createPort('/dev/TEST', { echo: false, record: false });
const serialPortMock = new SerialPortMock({
    path: '/dev/TEST',
    baudRate: 115200,
});

jest.mock('serialport', () => ({
    ...jest.requireActual('serialport'),
    SerialPort: jest.fn().mockImplementation(() => serialPortMock),
}));

let parser, parseSpy, monitor, emitSpy;

beforeEach(() => {
    parser = new P1ParserMock({ timezone: 'Europe/Amsterdam', withUnits: false });
    parseSpy = jest.spyOn(parser, 'parse');

    monitor = new P1Monitor(parser, {
        path: '/dev/TEST',
        baudRate: 115200,
        packet: { startChar: '/', stopChar: '!' },
    });

    emitSpy = jest.spyOn(monitor, 'emit');
});
afterEach(async () => {
    parseSpy.mockClear();
    emitSpy.mockClear();
    await monitor.dispose();
});

describe('Data handling', () => {
    it('can handle a DSMR 4.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr4.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledTimes(2);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', expect.objectContaining({
            vendor_id: 'ISk',
            model_id: '2MT382-1 000',
        }));
    });

    it('can handle a DSMR 5.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledTimes(2);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', expect.objectContaining({
            vendor_id: 'Ene',
            model_id: 'T210-D ESMR5.0',
        }));
    });

    it('can handle a ESMR 5.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/esmr5.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledTimes(2);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', expect.objectContaining({
            vendor_id: 'Ene',
            model_id: 'XS210 ESMR 5.0',
        }));
    });

    it('can handle a lot of small chunks at once', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        const parsed = {};
        parseSpy.mockImplementation(() => parsed);

        // Emit the data is chunks of 4 bytes.
        let i = 0;
        while (i <= data.length) {
            const packet = data.subarray(i, i += 4);
            serialPortMock.emit('data', packet);
        }

        expect(parseSpy).toBeCalledTimes(14);

        expect(emitSpy).toBeCalledTimes(15); // 14 data + 1 connected event.
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parsed);
    });

    it('can handle a buffer containing multiple packets', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        const parsed = {};
        parseSpy.mockImplementation(() => parsed);

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledTimes(14);

        expect(emitSpy).toBeCalledTimes(15); // 14 data + 1 connected event.
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parsed);
    });

    it('can handle data starting mid-message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/stop-character-at-start.txt');

        // serialPortMock.emit('data', data);

        const parsed = {};
        parseSpy.mockImplementation(() => parsed);

        let i = 0;
        while (i <= data.length) {
            serialPortMock.emit('data', data.subarray(i, i += 4));
        }

        expect(parseSpy).toBeCalledTimes(2);

        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parsed);
        expect(emitSpy).toBeCalledTimes(3);
    });

    it('emits an error event when the checksums mismatch', () => {
        const noop = () => void 0;
        monitor.on('error', noop);
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/invalid-checksum.txt');

        serialPortMock.emit('data', data);

        expect(emitSpy).toBeCalledWith('whoops', expect.any(ChecksumMismatchError));
        expect(emitSpy).toBeCalledTimes(1);

        monitor.off('error', noop);
    });

    it('emits disconnect after the default 11s timeout', async () => {
        // Only after we've connected we'll time out.
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt');
        serialPortMock.emit('data', data);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', expect.anything());

        // wait 11.1s before expecting the disconnect to occur.
        await new Promise(res => setTimeout(res, 11_100));

        expect(emitSpy).toBeCalledWith('disconnected');
    }, 12_000);

    it('emits disconnect after the given 1s timeout', async () => {
        await monitor.dispose();

        monitor = new P1Monitor(parser, {
            path: '/dev/TEST',
            baudRate: 115200,
            packet: { startChar: '/', stopChar: '!' },
            timeout: 1_000,
        });

        emitSpy = jest.spyOn(monitor, 'emit');

        // Only after we've connected we'll time out.
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt');
        serialPortMock.emit('data', data);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', expect.anything());

        // wait 1.1s before expecting the disconnect to occur.
        await new Promise(res => setTimeout(res, 1100));

        expect(emitSpy).toBeCalledWith('disconnected');
    }, 2_000);
});

describe('Event propagation', () => {
    it('re-emits error events from the serial port', () => {
        const noop = () => void 0;
        monitor.on('error', noop);

        serialPortMock.emit('error', new Error('Some error.'));

        expect(emitSpy).toBeCalledWith('error', expect.any(Error));

        monitor.off('error', noop);
    });

    it('re-emits close events from the serial port', () => {
        serialPortMock.emit('close');
        expect(emitSpy).toBeCalledWith('close', undefined);

        serialPortMock.emit('close', new Error('Some error.'));
        expect(emitSpy).toBeCalledWith('close', expect.any(Error));
    });
});
