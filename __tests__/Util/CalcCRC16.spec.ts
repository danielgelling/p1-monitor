import * as fs       from 'fs';
import { CalcCRC16 } from '../../src/Util/CalcCRC16';

describe('Calculating CRC16 value', () => {
    it('returns the correct CRC16 checksum for the predetermined payloads', () => {
        const testCases = [{
            data: Buffer.from('hello'),
            checksum: 13522,
        }, {
            data: fs.readFileSync(__dirname + '/../__fixtures__/p1-data/dsmr4.txt').subarray(0, 1067),
            checksum: parseInt('DC3F', 16), // same hex checksum as in fixture
        }, {
            data: fs.readFileSync(__dirname + '/../__fixtures__/p1-data/dsmr5.txt').subarray(0, 831),
            checksum: parseInt('8954', 16), // same hex checksum as in fixture
        }, {
            data: fs.readFileSync(__dirname + '/../__fixtures__/p1-data/esmr5.txt').subarray(0, 716),
            checksum: parseInt('8154', 16), // same hex checksum as in fixture
        }];

        for (const testCase of testCases) {
            expect(CalcCRC16(testCase.data)).toEqual(testCase.checksum);
        }
    });
});
