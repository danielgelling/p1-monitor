import { DateTime } from 'luxon';
export type P1Packet = {
    vendor_id: string;
    model_id: string;
    version?: string;
    transmitted_at?: Date | DateTime;
    message?: string;
    electricity: {
        equipment_id?: string;
        tariff?: number;
        received: {
            tariff1?: Value<'kWh'>;
            tariff2?: Value<'kWh'>;
            active?: Value<'kW'>;
        };
        delivered: {
            tariff1?: Value<'kWh'>;
            tariff2?: Value<'kWh'>;
            active?: Value<'kW'>;
        };
        failures: {
            count?: number;
            lasting_count?: number;
            log: {
                start_time: Date | DateTime;
                duration: Value<'s'>;
            }[];
        };
        sags: {
            line1?: number;
            line2?: number;
            line3?: number;
        };
        swells: {
            line1?: number;
            line2?: number;
            line3?: number;
        };
        active: {
            voltage: {
                line1?: Value<'V'>;
                line2?: Value<'V'>;
                line3?: Value<'V'>;
            };
            current: {
                line1?: Value<'A'>;
                line2?: Value<'A'>;
                line3?: Value<'A'>;
            };
            power: {
                positive: {
                    line1?: Value<'kW'>;
                    line2?: Value<'kW'>;
                    line3?: Value<'kW'>;
                };
                negative: {
                    line1?: Value<'kW'>;
                    line2?: Value<'kW'>;
                    line3?: Value<'kW'>;
                };
            };
        };
    };
    gas?: {
        equipment_id: string;
        measured_at: Date | DateTime;
        received: Value<'m3'>;
    };
    heat?: {
        equipment_id: string;
        measured_at: Date | DateTime;
        received: Value<'GJ'>;
    };
    water?: {
        equipment_id: string;
        measured_at: Date | DateTime;
        received: Value<'m3'>;
    };
};
export type ValueUnit = 'kWh' | 'kW' | 'V' | 'A' | 'm3' | 'GJ' | 's';
export type Value<T extends ValueUnit> = number;
type FloatType = {
    type: 'float';
    precision: number;
    scale: number;
};
type ArrayType = {
    type: 'array';
    items: ValueType[];
};
type ObjectType = {
    type: 'object';
    items: ValueType[];
};
type SimpleType = {
    type: 'integer' | 'string' | 'hex-string' | 'boolean' | 'timestamp';
};
type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}` : `${Key}`;
}[keyof ObjectType & (string | number)];
export type ValueType = {
    path: NestedKeyOf<P1Packet> | string;
    unit?: ValueUnit;
} & (FloatType | ArrayType | ObjectType | SimpleType);
/**
 * @see https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_a727fce1f1.pdf
 */
export declare const OBISTypeMapping: {
    [key in string]: ValueType;
};
export type MBusDevice = 'gas' | 'heat' | 'water';
export type MBusData = {
    name: MBusDevice;
    values: ValueType[];
};
/**
 * Mapping of M-BUS devices by their type (OBIS: `0-n:24.1.0`).
 *
 * @see page 13, table 2: https://oms-group.org/fileadmin/files/download4all/specification/Vol2/4.0.2/OMS-Spec_Vol2_Primary_v402.pdf
 */
export declare const MBusTypeMapping: {
    [key in number]: MBusData;
};
export {};
