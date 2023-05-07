import { P1Monitor, P1MonitorOptions } from './P1Monitor';
import { P1Parser, P1ParserOptions }   from './P1Parser';

export function createP1Monitor(options: P1ParserOptions & P1MonitorOptions): P1Monitor
{
    return new P1Monitor(
        createP1Parser(options),
        options,
    );
}

export function createP1Parser(options: P1ParserOptions): P1Parser
{
    return new P1Parser(options);
}
