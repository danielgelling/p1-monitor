/// <reference types="node" />
import { EventEmitter } from 'node:events';
import { P1Packet } from './P1Packet';
import { SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes } from '@serialport/bindings-cpp';
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
export declare class P1Monitor extends EventEmitter {
    private readonly options;
    private readonly _port;
    private _buffer;
    /**
     *  For when we've encountered a stop character but the remaining bytes
     *  in the buffer don't yet constitute a full checksum.
     */
    private _waitingForChecksum;
    constructor(options: P1MonitorOptions);
    private handleIncomingData;
    private parsePacket;
}
type P1MonitorOptions = {
    packet: {
        startChar: string;
        stopChar: string;
    };
} & Omit<SerialPortOpenOptions<AutoDetectTypes>, 'autoOpen'>;
export {};
