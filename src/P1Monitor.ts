import { EventEmitter }                      from 'node:events';
import { P1Packet }                          from './P1Packet';
import { SerialPort, SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes }                   from '@serialport/bindings-cpp';
import { CalcCRC16 }                         from './Util/CalcCRC16';
import { ChecksumMismatchError }             from './ChecksumMismatchError';
import { P1Parser }                          from './P1Parser';
import { TimeoutExceededError }              from './TimeoutExceededError';

export type P1MonitorOptions = {
    packet?: {
        /**
         * The character that denotes the start of the data in a P1 message.
         *
         * Defaults to: `/`
         */
        startChar?: string;
        /**
         * The character that denotes the end of the data in a P1 message.
         *
         * Defaults to: `!`
         */
        stopChar?: string;
    };
    /**
     * A timeout, in milliseconds, after which the last message is received, to
     * consider the serial port connection closed.
     *
     * Defaults to: 11 seconds.
     */
    timeout?: number;
} & Omit<SerialPortOpenOptions<AutoDetectTypes>, 'autoOpen'>;

export interface P1Monitor {
    /**
     * Emitted when the first message is received by the P1 monitor.
     */
    on(event: 'connected', listener: () => void): this;

    /**
     * Emitted when a new message is received on the serial port.
     */
    on(event: 'data', listener: (data: P1Packet) => void): this;

    /**
     * Emitted when an error occurs.
     */
    on(event: 'error', listener: (error: Error) => void): this;

    /**
     * Emitted when the serial port connection is closed.
     */
    on(event: 'close', listener: (error?: Error) => void): this;
}

export class P1Monitor extends EventEmitter
{
    /**
     * The serial port API connected to the P1 port.
     */
    private _port: SerialPort;

    /**
     * A buffer to store the incoming data in until a stop character is received.
     */
    private _buffer = Buffer.alloc(0);

    /**
     *  For when we've encountered a stop character but the remaining bytes
     *  in the buffer don't yet constitute a full checksum.
     */
    private _waitingForChecksum = false;

    /**
     * The datetime we received and verified the latest packet.
     */
    private _lastPacketReceivedAt?: Date;

    private _disconnectTimeout: NodeJS.Timeout;

    public constructor(
        private readonly parser: P1Parser,
        private readonly options: P1MonitorOptions,
    ) {
        super();
    }

    /**
     * Start the monitor.
     */
    public async start(): Promise<void>
    {
        this._port = new SerialPort({ autoOpen: true, ...this.options });

        this._port.on('error', (e) => this.emit('error', e));
        this._port.on('close', (e) => this.emit('close', e));

        this._port.on('data', (d: Buffer) => this.handleIncomingData(d));
    }

    /**
     * Dispose of the monitor.
     */
    public async dispose(): Promise<void>
    {
        return new Promise(resolve => {
            this._disconnectTimeout && clearTimeout(this._disconnectTimeout);

            this.removeAllListeners();
            this._port.removeAllListeners();

            this._port.close(() => resolve());
        });
    }

    private handleIncomingData(data: Buffer): void
    {
        // Add the incoming data to the buffer.
        this._buffer = Buffer.concat([this._buffer, data]);

        // Keep buffering the incoming data until a stop character is found.
        // Unless we're waiting to receive (the rest of) the checksum.
        if (data.indexOf(this.options.packet?.stopChar ?? '!') === -1
            && ! this._waitingForChecksum
        ) {
            return;
        }

        const startIndex = this._buffer.indexOf(this.options.packet?.startChar ?? '/');
        const stopIndex  = this._buffer.indexOf(this.options.packet?.stopChar ?? '!');

        // If we haven't found a start character clear the buffer and
        // keep waiting for more data.
        if (startIndex === -1) {
            this._buffer = Buffer.alloc(0);
            return;
        }

        // If a start character appears after an end character, discard the
        // data before the start character.
        if (startIndex > stopIndex) {
            const remaining = this._buffer.subarray(startIndex);
            this._buffer = Buffer.alloc(0);

            this.handleIncomingData(remaining);
            return;
        }

        // Grab the checksum from the end of the message.
        const checksum = this._buffer.subarray(stopIndex + 1, stopIndex + 5);

        // Wait until we have received the full checksum.
        if (checksum.length !== 4) {
            this._waitingForChecksum = true;
            return;
        }

        this._waitingForChecksum = false;

        // Read a full data packet from the buffer.
        data = this._buffer.subarray(startIndex, stopIndex + 1);

        // Verify that the calculated checksum matches the received checksum.
        if (CalcCRC16(data) !== parseInt(checksum.toString(), 16)) {
            this.emit('error', new ChecksumMismatchError(
                parseInt(checksum.toString(), 16),
                CalcCRC16(data),
            ));

            // Remove the corrupt data from the buffer, in an attempt to recover.
            this._buffer = this._buffer.subarray(stopIndex + 1);

            return;
        }

        // We've received and verified a new packet, so clear the disconnect timeout.
        this._disconnectTimeout && clearTimeout(this._disconnectTimeout);

        // If we've not yet received a packet, and the incoming data has been verified
        // emit that we've connected.
        if (typeof this._lastPacketReceivedAt === 'undefined'){
            this.emit('connected');

            this._disconnectTimeout = setTimeout(() => {
                this.emit('close', new TimeoutExceededError(this.options.timeout ?? 11_000));
                this.dispose().then(void 0);
            }, this.options.timeout ?? 11_000);
        }

        // Update the last time we've received and verified a packet.
        this._lastPacketReceivedAt = new Date();

        // Parse the data, without the start and stop characters and emit the result.
        this.emit('data', this.parser.parse(
            data.subarray(1, -1),
        ));

        // Grab the remaining bytes in the buffer, just before emptying it.
        const remaining = this._buffer.subarray(stopIndex + 1);
        this._buffer = Buffer.alloc(0);

        // If there is remaining data in the buffer, continue handling that data.
        if (remaining.length > 0) {
            this.handleIncomingData(remaining);
        }
    }
}
