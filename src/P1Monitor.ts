import { EventEmitter }                      from 'node:events';
import { P1Packet }                          from './P1Packet';
import { SerialPort, SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes }                   from '@serialport/bindings-cpp';
import { CalcCRC16 }                         from './Util/CalcCRC16';
import { ChecksumMismatchError }             from './ChecksumMismatchError';

export interface P1Monitor {
    /**
     * Emitted when the P1 monitor is connected to the serial port.
     */
    on(event: 'connected', listener: () => void): this;

    /**
     * Emitted when new data is received on the serial port.
     */
    on(event: 'data', listener: (data: P1Packet, raw: string) => void): this;

    /**
     * Emitted when an error occurs.
     */
    on(event: 'error', listener: (error: Error) => void): this;

    /**
     * Emitted when the serial connection closed.
     */
    on(event: 'close', listener: (error?: Error) => void): this;
}

export class P1Monitor extends EventEmitter
{
    private readonly _port: SerialPort;

    private _buffer = Buffer.alloc(0);

    /**
     *  For when we've encountered a stop character but the remaining bytes
     *  in the buffer don't yet constitute a full checksum.
     */
    private _waitingForChecksum = false;

    public constructor(private readonly options: P1MonitorOptions)
    {
        super();

        this._port = new SerialPort({ autoOpen: true, ...options });

        this._port.on('error', (e) => this.emit('error', e));
        this._port.on('close', (e) => this.emit('close', e));

        this._port.on('data', (d: Buffer) => this.handleIncomingData(d));
    }

    private handleIncomingData(data: Buffer): void
    {
        // Add the data to the buffer.
        this._buffer = Buffer.concat([this._buffer, data]);

        // Keep buffering the incoming data until we find a stop character.
        if (data.indexOf(this.options.packet.stopChar) === -1
            && ! this._waitingForChecksum
        ) {
            return;
        }

        const startIndex = this._buffer.indexOf(this.options.packet.startChar);
        const stopIndex  = this._buffer.indexOf(this.options.packet.stopChar);

        // If we haven't found a start character clear the buffer and
        // keep waiting for more data.
        if (startIndex === -1) {
            this._buffer = Buffer.alloc(0);
            return;
        }

        // If the start character appears after an end character, discard the
        // data before the start character.
        if (startIndex > stopIndex) {
            const remaining = this._buffer.subarray(startIndex);
            this._buffer = Buffer.alloc(0);

            this.handleIncomingData(remaining);

            return;
        }

        const checksum = this._buffer.subarray(stopIndex + 1, stopIndex + 5);

        // Wait until we have received the full checksum.
        if (checksum.length !== 4) {
            this._waitingForChecksum = true;
            return;
        }

        this._waitingForChecksum = false;

        this.handlePacket(
            this._buffer.subarray(startIndex, stopIndex + 1),
            checksum,
        );

        // Grab the remaining bytes in the buffer, just before emptying it.
        const remaining = this._buffer.subarray(stopIndex + 1);
        this._buffer = Buffer.alloc(0);

        // If there is remaining data in the buffer, continue handling that data.
        if (remaining.length > 0) {
            this.handleIncomingData(remaining);
        }
    }

    private handlePacket(data: Buffer, checksum: Buffer): void
    {
        if (CalcCRC16(data.toString()) !== parseInt(checksum.toString(), 16)) {
            this.emit('error', new ChecksumMismatchError(
                parseInt(checksum.toString(), 16),
                CalcCRC16(data.toString()),
            ));

            return;
        }

        this.emit('data');
    }
}

type P1MonitorOptions = { packet: {
    startChar: string;
    stopChar: string;
}; } & Omit<SerialPortOpenOptions<AutoDetectTypes>, 'autoOpen'>;
