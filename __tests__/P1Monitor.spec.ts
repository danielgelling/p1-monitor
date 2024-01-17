import { P1Monitor, P1Parser }   from '../src';
import { SerialPortMock }        from 'serialport';
import { MockBinding }           from '@serialport/binding-mock';
import * as fs                   from 'fs';
import { ChecksumMismatchError } from '../src/Error/ChecksumMismatchError';
import { P1Packet }              from '../src/P1Packet';
import { TimeoutExceededError }  from '../src/Error/TimeoutExceededError';

jest.useFakeTimers({ advanceTimers: true });
const timerSpy = jest.spyOn(global, 'setTimeout');

MockBinding.createPort('/dev/TEST', { echo: false, record: false });
const serialPortMock = new SerialPortMock({
    path: '/dev/TEST',
    baudRate: 115200,
});

jest.mock('serialport', () => ({
    ...jest.requireActual('serialport'),
    SerialPort: jest.fn().mockImplementation(() => serialPortMock),
}));

// Mock the parser.
const parser = new P1Parser({ timezone: 'Europe/Amsterdam', withUnits: false });
const parseSpy = jest.spyOn(parser, 'parse');
const parserResult: P1Packet = {
    vendor_id: 'Ene',
    model_id: 'XS210 ESMR 5.0',
    electricity: {
        received: {},
        delivered: {},
        active: { current: {}, power: { negative: {}, positive: {} }, voltage: {} },
        failures: { count: undefined, lasting_count: undefined, log: [] },
        sags: {},
        swells: {},
    },
};
parseSpy.mockImplementation(() => parserResult);

// Set up a new monitor instance for each test case.
let monitor: P1Monitor,
    emitSpy: jest.SpyInstance,
    disposeSpy: jest.SpyInstance;

beforeEach(async () => {
    monitor = new P1Monitor(parser, {
        path: '/dev/TEST',
        baudRate: 115200,
    });
    await monitor.start();
    disposeSpy = jest.spyOn(monitor, 'dispose');

    emitSpy = jest.spyOn(monitor, 'emit');
});

afterEach(async () => {
    parseSpy.mockClear();
    emitSpy.mockClear();
    await monitor.dispose();
});

describe('Data handling', () => {
    it('handles a DSMR 4.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr4.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledTimes(2);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
    });

    it('handles a DSMR 5.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledTimes(2);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
    });

    it('handles a ESMR 5.0 message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/esmr5.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledWith(data.subarray(1, -7));
        expect(parseSpy).toBeCalledTimes(1);

        expect(emitSpy).toBeCalledTimes(2);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
    });

    it('handles a lot of small chunks at once', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        // Emit the data is chunks of 4 bytes.
        let i = 0;
        while (i <= data.length) {
            const packet = data.subarray(i, i += 4);
            serialPortMock.emit('data', packet);
        }

        expect(parseSpy).toBeCalledTimes(14);

        expect(emitSpy).toBeCalledTimes(15); // 14 data + 1 connected event.
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
    });

    it('handles a buffer containing multiple packets', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/data-stream.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledTimes(14);

        expect(emitSpy).toBeCalledTimes(15); // 14 data + 1 connected event.
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
    });

    it('handles data starting mid-message', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/stop-character-at-start.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledTimes(2);

        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
        expect(emitSpy).toBeCalledTimes(3);
    });

    it('handles data starting mid-message, emitted in chunks', () => {
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/stop-character-at-start.txt');

        let i = 0;
        while (i <= data.length) {
            serialPortMock.emit('data', data.subarray(i, i += 16));
        }

        expect(parseSpy).toBeCalledTimes(2);

        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
        expect(emitSpy).toBeCalledTimes(3);
    });

    it('emits an error event when the checksums mismatch', () => {
        const noop = () => void 0;
        monitor.on('error', noop);
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/invalid-checksum.txt');

        serialPortMock.emit('data', data);

        expect(parseSpy).toBeCalledTimes(0);

        expect(emitSpy).toBeCalledWith('error', expect.any(ChecksumMismatchError));
        expect(emitSpy).toBeCalledTimes(1);

        monitor.off('error', noop);
    });

    it('emits close after the default 11s timeout', async () => {
        // Only after we've connected we'll time out.
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt');
        serialPortMock.emit('data', data);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);

        expect(emitSpy).not.toBeCalledWith('close');

        expect(timerSpy).toHaveBeenLastCalledWith(expect.any(Function), 11_000);

        jest.runAllTimers();

        expect(emitSpy).toBeCalledWith('close', expect.any(TimeoutExceededError));
        expect(disposeSpy).toBeCalledTimes(1);
    });

    it('emits close after the given 1s timeout', async () => {
        monitor = new P1Monitor(parser, {
            path: '/dev/TEST',
            baudRate: 115200,
            timeout: 1000,
        });
        await monitor.start();

        emitSpy = jest.spyOn(monitor, 'emit');

        // Only after we've connected we'll time out.
        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt');
        serialPortMock.emit('data', data);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);

        expect(emitSpy).not.toBeCalledWith('close');

        expect(timerSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

        jest.runAllTimers();

        expect(emitSpy).toBeCalledWith('close', expect.any(TimeoutExceededError));
        expect(disposeSpy).toBeCalledTimes(1);
    });

    it('considers the given start and stop characters as options', async () => {
        monitor = new P1Monitor(parser, {
            path: '/dev/TEST',
            baudRate: 115200,
            packet: { startChar: '^', stopChar: '&' },
            timeout: 1000,
        });
        await monitor.start();

        emitSpy = jest.spyOn(monitor, 'emit');

        const data = fs.readFileSync(__dirname + '/__fixtures__/p1-data/unusual-start-stop-chars.txt');
        serialPortMock.emit('data', data);
        expect(emitSpy).toBeCalledWith('connected');
        expect(emitSpy).toBeCalledWith('data', parserResult);
    });
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
