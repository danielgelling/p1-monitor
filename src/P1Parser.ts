import { MBusTypeMapping, OBISTypeMapping, P1Packet, Value, ValueType } from './P1Packet';
import { DateTime, IANAZone }                                           from 'luxon';
import * as console                                                     from 'console';
import { AssignNestedValue }                                            from './Util/AssignNestedValue';

export type P1ParserOptions = {
    /**
     *  The IANA timezone identifier configured in your Smart Meter.
     *
     *  Eg: "Europe/Amsterdam" or "America/New_York"
     */
    timezone: string;

    /**
     * Whether to return a value with their unit, if specified.
     * Defaults to: false.
     */
    withUnits?: boolean;

    /**
     * Whether the date values are returned as a Luxon DateTime,
     * or as the default JS Date object. Defaults to: false.
     */
    asLuxon?: boolean;
};

export class P1Parser
{
    /**
     * Contains the data of the packet that is currently being parsed.
     */
    private _packet: P1Packet;

    /**
     * Keeps track of the MBus device data, so at the end we can aggregate it.
     */
    private _mbus: { [key in number]: { [path in string]: unknown } } = {};

    /**
     *  The IANA timezone identifier configured in your Smart Meter.
     *
     *  Eg: "Europe/Amsterdam" or "America/New_York"
     */
    private readonly _timezone: IANAZone;

    public constructor(private readonly _options: P1ParserOptions)
    {
        this._timezone = IANAZone.create(_options.timezone);

        if (! this._timezone.isValid) {
            throw new Error('Invalid timezone.');
        }
    }

    /**
     * Parse the data packet into a P1Packet object. The data is expected to
     * contain the contents of a DSMR/ESMR data packet, so excluding the
     * start/stop characters and checksum.
     */
    public parse(data: Buffer): P1Packet
    {
        let line: Buffer;
        let eol = data.indexOf('\r\n');

        // Initialize a new packet with the vendor and model ids. Also initialize
        // some properties as undefined, to nicely structure the result.
        this._packet = {
            vendor_id: data.subarray(0, 3).toString(),
            model_id:  data.subarray(5, eol).toString(),
            version: undefined,
            transmitted_at: undefined,
            message: undefined,
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

        // Ignore the first line, plus the CR LF.
        data = data.subarray(eol + 2);

        // As long as there's data, keep parsing.
        while (data.length > 0) {
            eol  = data.indexOf('\r\n');
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

    /**
     * Parse a single line of the data packet.
     */
    private parseLine(line: Buffer): void
    {
        const delim = line.indexOf('(');
        const obis  = line.subarray(0, delim).toString();
        const value = line.subarray(delim).toString();
        const mbus  = obis.match(/0-(?<index>[1-4]):(?<obis>.*)/);

        if (null !== mbus) {
            this.parseMBusData(mbus, value);
            return;
        }

        const mapping = OBISTypeMapping[obis];

        if (typeof mapping === 'undefined') {
            console.log(`Ignoring line. OBIS code '${obis}' not mapped`);
            return;
        }

        if (mapping.path.indexOf('.') === -1) {
            this._packet[mapping.path] = this.parseValue(mapping, value);
            return;
        }

        AssignNestedValue(this._packet, mapping.path, this.parseValue(mapping, value));
    }

    /**
     * Parse the given value according to its mapping.
     */
    private parseValue(mapping: ValueType, value: string): unknown
    {
        switch (mapping.type) {
            case 'boolean':
                return value.substring(1, value.length - 1) === '1';
            case 'integer':
                return Number(value.substring(1, value.length - 1));
            case 'string':
                return value.substring(1, value.length - 1);
            case 'hex-string':
                return value.substring(1, value.length - 1)
                    .match(/.{2}/g)
                    ?.map((v) => {
                        return String.fromCharCode(parseInt(v, 16));
                    }).join('');
            case 'timestamp': {
                // Ignore the (), but also ignore the last character (S/W) that
                // represents DST or not, which is not actually used by most
                // Smart Meter implementations as they transmit times in their
                // current timezone.
                value = value.substring(1, value.length - 2);

                const result = DateTime.fromFormat(
                    value,
                    'yyMMddHHmmss',
                    { zone: this._timezone },
                );

                return this._options.asLuxon ? result : result.toJSDate();
            }
            case 'float': {
                if (typeof mapping.unit === 'undefined') {
                    return Number(value.substring(1, value.length - 1));
                }

                const parts = value.substring(1, value.length - 1).split('*');

                if (parts[1] !== mapping.unit) {
                    console.log(
                        parts,
                        `Unit received does not match mapped unit. Got ${parts[1]}, expected: ${mapping.unit}`,
                    );
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

    /**
     * Parse the data line for an MBus device.
     */
    private parseMBusData(mbus: RegExpMatchArray, value: string): void
    {
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

                const mapping = MBusTypeMapping[this._mbus[mbus.groups.index].type];

                if (typeof mapping === 'undefined') {
                    console.log(`Ignoring line. MBus Device-Type '${this._mbus[mbus.groups.index].type}' not mapped`);
                    return;
                }

                const values = this.parseValue({
                    path: 'values',
                    type: 'object',
                    items: mapping.values,
                }, value) as {
                    measured_at: Date | DateTime;
                    received: Value<'m3'> & Value<'GJ'>;
                };

                this._packet[mapping.name] = {
                    equipment_id: this._mbus[mbus.groups.index].equipment_id as string,
                    measured_at: values.measured_at,
                    received: values.received,
                };

                return;
            }
        }
    }
}
