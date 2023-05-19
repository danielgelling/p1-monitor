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
            active?:  Value<'kW'>;
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

export type Value<T extends ValueUnit> = number | {
    value: number;
    unit: T;
};

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

type NestedKeyOf<ObjectType extends object> =
    {[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
        : `${Key}`
    }[keyof ObjectType & (string | number)];

export type ValueType = {
    path: NestedKeyOf<P1Packet> | string;
    unit?: ValueUnit;
} & (FloatType | ArrayType | ObjectType| SimpleType);

/**
 * @see https://www.netbeheernederland.nl/_upload/Files/Slimme_meter_15_a727fce1f1.pdf
 */
export const OBISTypeMapping: {[key in string]: ValueType} = {
    '1-3:0.2.8': {
        path: 'version',
        type: 'string',
    },
    '0-0:1.0.0': {
        path: 'transmitted_at',
        type: 'timestamp',
    },
    '0-0:96.1.1': {
        path: 'electricity.equipment_id',
        type: 'hex-string',
    },
    '1-0:1.8.1': {
        path: 'electricity.received.tariff1',
        type: 'float',
        precision: 3,
        scale: 3,
        unit: 'kWh',
    },
    '1-0:1.8.2': {
        path: 'electricity.received.tariff2',
        type: 'float',
        precision: 3,
        scale: 3,
        unit: 'kWh',
    },
    '1-0:1.7.0': {
        path: 'electricity.received.active',
        type: 'float',
        precision: 3,
        scale: 3,
        unit: 'kW',
    },
    '1-0:2.8.1': {
        path: 'electricity.delivered.tariff1',
        type: 'float',
        precision: 3,
        scale: 3,
        unit: 'kWh',
    },
    '1-0:2.8.2': {
        path: 'electricity.delivered.tariff2',
        type: 'float',
        precision: 3,
        scale: 3,
        unit: 'kWh',
    },
    '1-0:2.7.0': {
        path: 'electricity.delivered.active',
        type: 'float',
        precision: 3,
        scale: 3,
        unit: 'kW',
    },
    '0-0:96.14.0': {
        path: 'electricity.tariff',
        type: 'integer',
    },
    '0-0:96.7.21': {
        path: 'electricity.failures.count',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '0-0:96.7.9': {
        path: 'electricity.failures.lasting_count',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '1-0:99.97.0': {
        path: 'electricity.failures.log',
        type: 'array',
        items: [{
            path: 'start_time',
            type: 'timestamp',
        }, {
            path: 'duration',
            type: 'float',
            unit: 's',
            precision: 0,
            scale: 10,
        }],
    },
    '1-0:32.32.0': {
        path: 'electricity.sags.line1',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '1-0:52.32.0': {
        path: 'electricity.sags.line2',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '1-0:72.32.0': {
        path: 'electricity.sags.line3',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '1-0:32.36.0': {
        path: 'electricity.swells.line1',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '1-0:52.36.0': {
        path: 'electricity.swells.line2',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '1-0:72.36.0': {
        path: 'electricity.swells.line3',
        type: 'float',
        precision: 0,
        scale: 0,
    },
    '0-0:96.13.0': {
        path: 'message',
        type: 'hex-string',
    },
    '1-0:32.7.0': {
        path: 'electricity.active.voltage.line1',
        type: 'float',
        precision: 4,
        scale: 1,
        unit: 'V',
    },
    '1-0:52.7.0': {
        path: 'electricity.active.voltage.line2',
        type: 'float',
        precision: 4,
        scale: 1,
        unit: 'V',
    },
    '1-0:72.7.0': {
        path: 'electricity.active.voltage.line3',
        type: 'float',
        precision: 4,
        scale: 1,
        unit: 'V',
    },
    '1-0:31.7.0': {
        path: 'electricity.active.current.line1',
        type: 'float',
        precision: 3,
        scale: 0,
        unit: 'A',
    },
    '1-0:51.7.0': {
        path: 'electricity.active.current.line2',
        type: 'float',
        precision: 3,
        scale: 0,
        unit: 'A',
    },
    '1-0:71.7.0': {
        path: 'electricity.active.current.line3',
        type: 'float',
        precision: 3,
        scale: 0,
        unit: 'A',
    },
    '1-0:21.7.0': {
        path: 'electricity.active.power.positive.line1',
        type: 'float',
        precision: 5,
        scale: 3,
        unit: 'kW',
    },
    '1-0:41.7.0': {
        path: 'electricity.active.power.positive.line2',
        type: 'float',
        precision: 5,
        scale: 3,
        unit: 'kW',
    },
    '1-0:61.7.0': {
        path: 'electricity.active.power.positive.line3',
        type: 'float',
        precision: 5,
        scale: 3,
        unit: 'kW',
    },
    '1-0:22.7.0': {
        path: 'electricity.active.power.negative.line1',
        type: 'float',
        precision: 5,
        scale: 3,
        unit: 'kW',
    },
    '1-0:42.7.0': {
        path: 'electricity.active.power.negative.line2',
        type: 'float',
        precision: 5,
        scale: 3,
        unit: 'kW',
    },
    '1-0:62.7.0': {
        path: 'electricity.active.power.negative.line3',
        type: 'float',
        precision: 5,
        scale: 3,
        unit: 'kW',
    },
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
export const MBusTypeMapping: {[key in number]: MBusData} = {
    3: {
        name: 'gas',
        values: [{
            path: 'measured_at',
            type: 'timestamp',
        }, {
            path: 'received',
            type: 'float',
            unit: 'm3',
            precision: 8,
            scale: 3,
        }],
    },
    4: {
        name: 'heat',
        values: [{
            path: 'measured_at',
            type: 'timestamp',
        }, {
            path: 'received',
            type: 'float',
            unit: 'GJ',
            precision: Infinity,
            scale: 2,
        }],
    },
    7: {
        name: 'water',
        values: [{
            path: 'measured_at',
            type: 'timestamp',
        }, {
            path: 'received',
            type: 'float',
            unit: 'm3',
            precision: Infinity,
            scale: 3,
        }],
    },
};
