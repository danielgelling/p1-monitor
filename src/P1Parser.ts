import { OBISTypeMapping, P1Packet, ValueType } from './P1Packet';
import { DateTime, IANAZone }                   from 'luxon';
import * as console                             from 'console';
import { NestedObject }                         from './Util/NestedObject';

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
    private _packet: P1Packet;

    private readonly _timezone: IANAZone;

    public constructor(private readonly _options: P1ParserOptions)
    {
        this._timezone = IANAZone.create(_options.timezone);

        if (! this._timezone.isValid) {
            throw new Error('Invalid timezone.');
        }
    }

    public parse(data: Buffer): P1Packet
    {
        let line: Buffer;
        let eol = data.indexOf('\r\n');

        this._packet = {
            vendor_id: data.subarray(0, 3).toString(),
            model_id:  data.subarray(5, eol).toString(),
        };

        data = data.subarray(eol + 2);

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

    private parseLine(line: Buffer, i = 0): void
    {
        const delim = line.indexOf('(');
        const obis  = line.subarray(0, delim).toString();
        const value = line.subarray(delim).toString();

        const mapping = OBISTypeMapping[obis];

        if (typeof mapping === 'undefined') {
            // console.log('Ignoring line:', obis);
            return;
        }

        const mapPaths = mapping.path.split('.');


        console.log('VALUEEEEE: ', value, mapping.path);

        if (mapPaths.length === 1) {
            if (typeof this._packet[mapping.path] === 'undefined') {
                this._packet[mapping.path] = this.parseValue(mapping, value);
                return;
            }

            // const [path, parsed] = this.parseValue(mapping, value);

            // this._packet[mapping.path][path] = parsed;

            return;
        }

        NestedObject(this._packet, mapping.path, this.parseValue(mapping, value));
    }

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
                // Ignore the (), but also ignore the last character which
                // represents DST or not, but is not actually used by Smart Meter implementations.
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

                if (mapping.items.length === parts.length) {
                    for (const [i, item] of mapping.items.entries()) {
                        result[item.path] = this.parseValue(item, '(' + parts[i] + ')');
                    }

                    return result;
                }

                const length = Number(parts[0]);
                const obis = parts[1];

                const values = parts.slice(2);

                for (const [index, part] of values.entries()) {
                    const map = mapping.items[index % mapping.items.length];

                    // When there are only as many values as there are paths.
                    if (mapping.items.length >= values.length) {
                        result[map.path].push(this.parseValue(map, '(' + part + ')'));
                        continue;
                    }

                    const c = index % mapping.items.length === 0 ? index : index -1;

                    if (typeof result[c] === 'undefined') {
                        result[c] = {
                            [map.path]: this.parseValue(map, '(' + part + ')'),
                        };
                        continue;
                    }

                    result[c][map.path] = this.parseValue(map, '(' + part + ')');
                }

                if (Object.values(result).length !== length) {
                    console.log(result, parts,  values);
                    console.log('Expected length does not match actual value count.');
                }

                return Object.values(result);
            }
        }
    }
}
