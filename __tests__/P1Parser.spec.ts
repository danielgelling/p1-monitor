import { P1Parser } from '../src';
import * as fs      from 'fs';
import { DateTime } from 'luxon';

describe('Parser validates the given options', () => {
    it('throws when the given timezone is invalid', () => {
        expect(() => {
            new P1Parser({ timezone: 'Moon/DarkSide' });
        }).toThrow('Invalid timezone: "Moon/DarkSide"');
    });

    it('does not throw when the given timezone is valid', () => {
        expect(() => {
            new P1Parser({ timezone: 'Europe/Amsterdam' });
        }).not.toThrow();
    });
});

describe('Parser parses the different kinds of telegrams', () => {
    const parser = new P1Parser({ timezone: 'Europe/Amsterdam' });
    const specifications = [
        'dsmr4',
        'dsmr5',
        'esmr5',
    ];

    for (const specification of specifications) {
        it(`parses a ${specification} message correctly`, () => {
            const result = parser.parse(
                fs.readFileSync(__dirname + `/__fixtures__/p1-data/${specification}.txt`).subarray(1, -7),
            );

            expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse(
                fs.readFileSync(__dirname + `/__fixtures__/p1-data/${specification}.json`, 'utf-8'),
            ));
        });
    }
});

describe('Parser respects the given option', () => {
    it('returns a Luxon DateTime object when `asLuxon` is true', () => {
        const parser = new P1Parser({
            timezone: 'Europe/Amsterdam',
            asLuxon: true,
        });

        const result = parser.parse(
            fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt').subarray(1, -7),
        );

        expect(result.transmitted_at).toBeInstanceOf(DateTime);
        expect(result.transmitted_at).not.toBeInstanceOf(Date);

        if (typeof result.gas !== 'undefined') {
            expect(result.gas.measured_at).toBeInstanceOf(DateTime);
            expect(result.gas.measured_at).not.toBeInstanceOf(Date);
        }
    });

    it('returns a simple JS Date object as default', () => {
        const parser = new P1Parser({
            timezone: 'Europe/Amsterdam',
        });

        const result = parser.parse(
            fs.readFileSync(__dirname + '/__fixtures__/p1-data/dsmr5.txt').subarray(1, -7),
        );

        expect(result.transmitted_at).toBeInstanceOf(Date);
        expect(result.transmitted_at).not.toBeInstanceOf(DateTime);

        if (typeof result.gas !== 'undefined' && typeof result.gas.measured_at !== 'undefined') {
            expect(result.gas.measured_at).toBeInstanceOf(Date);
            expect(result.gas.measured_at).not.toBeInstanceOf(DateTime);
        }
    });

    it('returns a the value with its unit, if `withUnits` is true', () => {
        const parser = new P1Parser({
            timezone: 'Europe/Amsterdam',
            withUnits: true,
        });

        const result = parser.parse(
            fs.readFileSync(__dirname + '/__fixtures__/p1-data/esmr5.txt').subarray(1, -7),
        );

        expect(result.electricity.received.tariff1).toEqual({
            value: 2107.618,
            unit: 'kWh',
        });
        expect(result.electricity.active.current.line1).toEqual({
            value: 1,
            unit: 'A',
        });
        expect(result.electricity.sags.line1).toBe(5);
        expect(result.electricity.swells.line1).toBe(0);
    });

    it('returns a the value without the unit, as default', () => {
        const parser = new P1Parser({
            timezone: 'Europe/Amsterdam',
        });

        const result = parser.parse(
            fs.readFileSync(__dirname + '/__fixtures__/p1-data/esmr5.txt').subarray(1, -7),
        );

        expect(result.electricity.received.tariff1).toBe(2107.618);
        expect(result.electricity.active.current.line1).toBe(1);
        expect(result.electricity.sags.line1).toBe(5);
        expect(result.electricity.swells.line1).toBe(0);
    });

    const provider = [
        { spec: 'esmr5', timezone: 'UTC', expected: '2023-05-07T16:55:13.000Z' },
        { spec: 'esmr5', timezone: 'Europe/Amsterdam', expected: '2023-05-07T14:55:13.000Z' },
        { spec: 'esmr5', timezone: 'Europe/London', expected: '2023-05-07T15:55:13.000Z' },
        { spec: 'esmr5', timezone: 'America/New_York', expected: '2023-05-07T20:55:13.000Z' },
        { spec: 'dsmr5', timezone: 'UTC', expected: '2018-01-08T20:25:37.000Z' },
        { spec: 'dsmr5', timezone: 'Europe/Amsterdam', expected: '2018-01-08T19:25:37.000Z' },
        { spec: 'dsmr5', timezone: 'Europe/London', expected: '2018-01-08T20:25:37.000Z' },
        { spec: 'dsmr5', timezone: 'America/New_York', expected: '2018-01-09T01:25:37.000Z' },
    ];

    for (const d of provider) {
        it(`uses the timezone "${d.timezone}" when parsing timestamps`, () => {
            const parser = new P1Parser({
                timezone: d.timezone,
            });

            const result = parser.parse(
                fs.readFileSync(__dirname + `/__fixtures__/p1-data/${d.spec}.txt`).subarray(1, -7),
            );

            expect((result.transmitted_at as Date).toISOString()).toEqual(d.expected);
        });
    }
});
