"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1Parser = void 0;
const P1Packet_1 = require("./P1Packet");
const luxon_1 = require("luxon");
const console = __importStar(require("console"));
const NestedObject_1 = require("./Util/NestedObject");
class P1Parser {
    constructor(_options) {
        this._options = _options;
        this._mbus = {};
        this._timezone = luxon_1.IANAZone.create(_options.timezone);
        if (!this._timezone.isValid) {
            throw new Error('Invalid timezone.');
        }
    }
    parse(data) {
        let line;
        let eol = data.indexOf('\r\n');
        this._packet = {
            vendor_id: data.subarray(0, 3).toString(),
            model_id: data.subarray(5, eol).toString(),
            version: undefined,
            transmitted_at: undefined,
            electricity: {
                equipment_id: undefined,
                tariff: undefined,
                received: {},
                delivered: {},
                active: { current: {}, power: { negative: {}, positive: {} }, voltage: {} },
                failures: { count: undefined, lasting_count: undefined, log: [] },
                sags: {},
                swells: {},
            },
        };
        data = data.subarray(eol + 2);
        while (data.length > 0) {
            eol = data.indexOf('\r\n');
            line = data.subarray(0, eol);
            data = data.subarray(eol + 2);
            // Ignore empty lines.
            if (line.length === 0) {
                continue;
            }
            this.parseLine(line);
        }
        return this._packet;
    }
    parseLine(line, i = 0) {
        const delim = line.indexOf('(');
        const obis = line.subarray(0, delim).toString();
        const value = line.subarray(delim).toString();
        const mbus = obis.match(/0-(?<index>[1-4]):(?<obis>.*)/);
        if (null !== mbus) {
            this.parseMBusData(mbus, value);
            return;
        }
        const mapping = P1Packet_1.OBISTypeMapping[obis];
        if (typeof mapping === 'undefined') {
            console.log(`Ignoring line. OBIS code '${obis}' not mapped`);
            return;
        }
        if (mapping.path.indexOf('.') === -1) {
            this._packet[mapping.path] = this.parseValue(mapping, value);
            return;
        }
        (0, NestedObject_1.NestedObject)(this._packet, mapping.path, this.parseValue(mapping, value));
    }
    parseValue(mapping, value) {
        var _a;
        switch (mapping.type) {
            case 'boolean':
                return value.substring(1, value.length - 1) === '1';
            case 'integer':
                return Number(value.substring(1, value.length - 1));
            case 'string':
                return value.substring(1, value.length - 1);
            case 'hex-string':
                return (_a = value.substring(1, value.length - 1)
                    .match(/.{2}/g)) === null || _a === void 0 ? void 0 : _a.map((v) => {
                    return String.fromCharCode(parseInt(v, 16));
                }).join('');
            case 'timestamp': {
                // Ignore the (), but also ignore the last character (S/W) that
                // represents DST or not, which is not actually used by most
                // Smart Meter implementations as they transmit times in their
                // current timezone.
                value = value.substring(1, value.length - 2);
                const result = luxon_1.DateTime.fromFormat(value, 'yyMMddHHmmss', { zone: this._timezone });
                return this._options.asLuxon ? result : result.toJSDate();
            }
            case 'float': {
                if (typeof mapping.unit === 'undefined') {
                    return Number(value.substring(1, value.length - 1));
                }
                const parts = value.substring(1, value.length - 1).split('*');
                if (parts[1] !== mapping.unit) {
                    console.log(parts, `Unit received does not match mapped unit. Got ${parts[1]}, expected: ${mapping.unit}`);
                    return;
                }
                return this._options.withUnits ? {
                    value: Number(parts[0]),
                    unit: mapping.unit,
                } : Number(parts[0]);
            }
            case 'array': {
                const parts = value.substring(1, value.length - 1).split(')(');
                const result = {};
                const length = Number(parts[0]);
                const values = parts.slice(2); // Remove the length and OBIS code.
                for (const [index, part] of values.entries()) {
                    const map = mapping.items[index % mapping.items.length];
                    // Determine the index of the item based on how many values
                    // are mapped. So we combine them into a single object that
                    // is to be added to the array of objects.
                    const c = (index % mapping.items.length) === 0
                        ? index
                        : index - 1;
                    if (typeof result[c] === 'undefined') {
                        result[c] = {};
                    }
                    result[c][map.path] = this.parseValue(map, '(' + part + ')');
                }
                if (Object.values(result).length !== length) {
                    console.log('Expected length does not match actual value count.');
                }
                return Object.values(result);
            }
            case 'object': {
                const parts = value.substring(1, value.length - 1).split(')(');
                const result = {};
                if (mapping.items.length !== parts.length) {
                    console.log('Not the same amount of items in mapping vs object.');
                }
                for (const [i, item] of mapping.items.entries()) {
                    result[item.path] = this.parseValue(item, '(' + parts[i] + ')');
                }
                return result;
            }
        }
    }
    parseMBusData(mbus, value) {
        if (typeof mbus.groups === 'undefined') {
            return;
        }
        if (typeof this._mbus[mbus.groups.index] === 'undefined') {
            this._mbus[mbus.groups.index] = {};
        }
        switch (mbus.groups.obis) {
            case '24.1.0':
                this._mbus[mbus.groups.index].type = this.parseValue({
                    path: 'type',
                    type: 'integer',
                }, value);
                return;
            case '96.1.0':
                this._mbus[mbus.groups.index].equipment_id = this.parseValue({
                    path: 'equipment_id',
                    type: 'hex-string',
                }, value);
                return;
            case '24.2.1': {
                if (typeof this._mbus[mbus.groups.index].type === 'undefined') {
                    // FIXME: make sure to also be able to parse messages
                    //        where the MBus device type comes after the values.
                    console.log('Ignoring MBus value. Device-Type not (yet) known');
                    return;
                }
                const mapping = P1Packet_1.MBusTypeMapping[this._mbus[mbus.groups.index].type];
                if (typeof mapping === 'undefined') {
                    console.log(`Ignoring line. MBus Device-Type '${this._mbus[mbus.groups.index].type}' not mapped`);
                    return;
                }
                const values = this.parseValue({
                    path: 'values',
                    type: 'object',
                    items: mapping.values,
                }, value);
                this._packet[mapping.name] = {
                    equipment_id: this._mbus[mbus.groups.index].equipment_id,
                    measured_at: values.measured_at,
                    received: values.received,
                };
                return;
            }
        }
    }
}
exports.P1Parser = P1Parser;
//# sourceMappingURL=P1Parser.js.map