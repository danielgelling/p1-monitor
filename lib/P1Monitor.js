"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1Monitor = void 0;
const node_events_1 = require("node:events");
const serialport_1 = require("serialport");
const CalcCRC16_1 = require("./Util/CalcCRC16");
const ChecksumMismatchError_1 = require("./ChecksumMismatchError");
class P1Monitor extends node_events_1.EventEmitter {
    constructor(parser, options) {
        super();
        this.parser = parser;
        this.options = options;
        /**
         * A buffer to store the incoming data in until a stop character is received.
         */
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
    /**
     * Dispose of the monitor.
     */
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this._disconnectTimeout && clearTimeout(this._disconnectTimeout);
                this.removeAllListeners();
                this._port.removeAllListeners();
                this._port.close(() => resolve());
            });
        });
    }
    handleIncomingData(data) {
        var _a, _b, _c, _d;
        // Add the incoming data to the buffer.
        this._buffer = Buffer.concat([this._buffer, data]);
        // Keep buffering the incoming data until a stop character is found.
        // Unless we're waiting to receive (the rest of) the checksum.
        if (data.indexOf((_a = this.options.packet.stopChar) !== null && _a !== void 0 ? _a : '!') === -1
            && !this._waitingForChecksum) {
            return;
        }
        const startIndex = this._buffer.indexOf((_b = this.options.packet.startChar) !== null && _b !== void 0 ? _b : '/');
        const stopIndex = this._buffer.indexOf((_c = this.options.packet.stopChar) !== null && _c !== void 0 ? _c : '!');
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
        if ((0, CalcCRC16_1.CalcCRC16)(data) !== parseInt(checksum.toString(), 16)) {
            this.emit('error', new ChecksumMismatchError_1.ChecksumMismatchError(parseInt(checksum.toString(), 16), (0, CalcCRC16_1.CalcCRC16)(data)));
            // Remove the corrupt data from the buffer, in an attempt to recover.
            this._buffer = this._buffer.subarray(stopIndex + 1);
            return;
        }
        // We've received and verified a new packet, so clear the disconnect timeout.
        this._disconnectTimeout && clearTimeout(this._disconnectTimeout);
        // If we've not yet received a packet, and the incoming data has been verified
        // emit that we've connected.
        if (typeof this._lastPacketReceivedAt === 'undefined') {
            this.emit('connected');
            this._disconnectTimeout = setTimeout(() => {
                this.emit('disconnected');
            }, (_d = this.options.timeout) !== null && _d !== void 0 ? _d : 11000);
        }
        // Update the last time we've received and verified a packet.
        this._lastPacketReceivedAt = new Date();
        // Parse the data, without the start and stop characters and emit the result.
        this.emit('data', this.parser.parse(data.subarray(1, -1)));
        // Grab the remaining bytes in the buffer, just before emptying it.
        const remaining = this._buffer.subarray(stopIndex + 1);
        this._buffer = Buffer.alloc(0);
        // If there is remaining data in the buffer, continue handling that data.
        if (remaining.length > 0) {
            this.handleIncomingData(remaining);
        }
    }
}
exports.P1Monitor = P1Monitor;
//# sourceMappingURL=P1Monitor.js.map