/// <reference types="node" />
import { P1Packet } from './P1Packet';
export type P1ParserOptions = {
    /**
     *  The IANA timezone identifier, configured in your Smart Meter, that will
     *  be used when parsing the timestamps of the P1 messages.
     *
     *  Eg: "Europe/Amsterdam" or "America/New_York"
     */
    timezone: string;
    /**
     * Whether to return a value with their unit, if specified.
     *
     * Defaults to: false.
     */
    withUnits?: boolean;
    /**
     * Whether the date values are returned as a Luxon DateTime,
     * or as the default JS Date object.
     *
     * Defaults to: false.
     */
    asLuxon?: boolean;
};
export declare class P1Parser {
    private readonly _options;
    /**
     * Contains the data of the packet that is currently being parsed.
     */
    private _packet;
    /**
     * Keeps track of the MBus device data, so at the end we can aggregate it.
     */
    private _mbus;
    /**
     *  The IANA timezone identifier configured in your Smart Meter.
     *
     *  Eg: "Europe/Amsterdam" or "America/New_York"
     */
    private readonly _timezone;
    constructor(_options: P1ParserOptions);
    /**
     * Parse the data packet into a P1Packet object. The data is expected to
     * contain the contents of a DSMR/ESMR data packet, so excluding the
     * start/stop characters and checksum.
     */
    parse(data: Buffer): P1Packet;
    /**
     * Parse a single line of the data packet.
     */
    private parseLine;
    /**
     * Parse the given value according to its mapping.
     */
    private parseValue;
    /**
     * Parse the data line for an MBus device.
     */
    private parseMBusData;
}
