/// <reference types="node" />
import { EventEmitter } from 'node:events';
import { P1Packet } from './P1Packet';
import { SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes } from '@serialport/bindings-cpp';
import { P1Parser } from './P1Parser';
export type P1MonitorOptions = {
    packet: {
        /**
         * The character that denotes the start of a P1 message.
         *
         * Defaults to: `/`
         */
        startChar?: string;
        /**
         * The character that denotes the end of a P1 message.
         *
         * Defaults to: `!`
         */
        stopChar?: string;
    };
    /**
     * A timeout, in milliseconds, after the moment we received our last message,
     * to consider the serial port disconnected.
     *
     * Defaults to: 11 seconds.
     */
    timeout?: number;
} & Omit<SerialPortOpenOptions<AutoDetectTypes>, 'autoOpen'>;
export interface P1Monitor {
    /**
     * Emitted when the P1 monitor is connected to the serial port.
     */
    on(event: 'connected', listener: () => void): this;
    /**
     * Emitted when the P1 monitor is disconnected from the serial port.
     */
    on(event: 'disconnected', listener: () => void): this;
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
    private readonly parser;
    private readonly options;
    /**
     * The serial port API connected to the P1 port.
     */
    private readonly _port;
    /**
     * A buffer to store the incoming data in until a stop character is received.
     */
    private _buffer;
    /**
     *  For when we've encountered a stop character but the remaining bytes
     *  in the buffer don't yet constitute a full checksum.
     */
    private _waitingForChecksum;
    /**
     * The datetime we received and verified the latest packet.
     */
    private _lastPacketReceivedAt?;
    private _disconnectTimeout;
    constructor(parser: P1Parser, options: P1MonitorOptions);
    /**
     * Dispose of the monitor.
     */
    dispose(): Promise<void>;
    private handleIncomingData;
}
