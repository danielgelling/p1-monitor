/// <reference types="node" />
import { P1Packet } from './P1Packet';
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
export declare class P1Parser {
    private readonly _options;
    private _packet;
    private _mbus;
    private readonly _timezone;
    constructor(_options: P1ParserOptions);
    parse(data: Buffer): P1Packet;
    private parseLine;
    private parseValue;
    private parseMBusData;
}
