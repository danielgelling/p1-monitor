import { P1Parser } from '../../src';
import { P1Packet } from '../../src/P1Packet';

export class P1ParserMock extends P1Parser
{
    public parse(data: Buffer): P1Packet
    {
        return super.parse(data);
    }
}
