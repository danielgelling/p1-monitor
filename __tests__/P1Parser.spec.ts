import { P1Parser } from '../src';

const parser = new P1Parser({ timezone: 'Europe/Amsterdam', withUnits: false });

describe('Thing', () => {
    it('does thing', () =>{
        expect(true).toBeTruthy();
    });
});
