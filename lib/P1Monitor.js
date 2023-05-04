"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1Monitor = void 0;
const node_events_1 = require("node:events");
const serialport_1 = require("serialport");
const CalcCRC16_1 = require("./Util/CalcCRC16");
const ChecksumMismatchError_1 = require("./ChecksumMismatchError");
class P1Monitor extends node_events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this._buffer = Buffer.alloc(0);
        /**
         *  For when we've encountered a stop character but the remaining bytes
         *  in the buffer don't yet constitute a full checksum.
         */
        this._waitingForChecksum = false;
        this._port = new serialport_1.SerialPort(Object.assign({ autoOpen: true }, options));
        this._port.on('error', (e) => this.emit('error', e));
        this._port.on('close', (e) => this.emit('close', e));
        this._port.on('data', (d) => this.handleIncomingData(d));
    }
    handleIncomingData(data) {
        // Add the data to the buffer.
        this._buffer = Buffer.concat([this._buffer, data]);
        // Keep buffering the incoming data until we find a stop character.
        if (data.indexOf(this.options.packet.stopChar) === -1
            && !this._waitingForChecksum) {
            return;
        }
        const startIndex = this._buffer.indexOf(this.options.packet.startChar);
        const stopIndex = this._buffer.indexOf(this.options.packet.stopChar);
        // If we haven't found a start character, or it appears after the
        // stop character, clear the buffer and keep waiting for more data.
        if (startIndex === -1 || startIndex > stopIndex) {
            this._buffer = Buffer.alloc(0);
            return;
        }
        const checksum = this._buffer.subarray(stopIndex + 1, stopIndex + 5);
        // Wait until we have received the full checksum.
        if (checksum.length !== 4) {
            this._waitingForChecksum = true;
            return;
        }
        this._waitingForChecksum = false;
        this.parsePacket(this._buffer.subarray(startIndex, stopIndex + 1), checksum);
        // Grab the remaining bytes in the buffer, just before emptying it.
        const remaining = this._buffer.subarray(stopIndex + 1);
        this._buffer = Buffer.alloc(0);
        // If there is remaining data in the buffer, continue handling that data.
        if (remaining.length > 0) {
            this.handleIncomingData(remaining);
        }
    }
    parsePacket(data, checksum) {
        if ((0, CalcCRC16_1.CalcCRC16)(data.toString()) !== parseInt(checksum.toString(), 16)) {
            this.emit('error', new ChecksumMismatchError_1.ChecksumMismatchError(parseInt(checksum.toString(), 16), (0, CalcCRC16_1.CalcCRC16)(data.toString())));
            return;
        }
        this.emit('data');
    }
}
exports.P1Monitor = P1Monitor;
//# sourceMappingURL=P1Monitor.js.map