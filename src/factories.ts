import { P1Monitor, P1MonitorOptions } from './P1Monitor';
import { P1Parser }                    from './P1Parser';

export function createP1Monitor(options: P1MonitorOptions): P1Monitor
{
    return new P1Monitor(
        createP1Parser(),
        options,
    );
}

export function createP1Parser(): P1Parser
{
    return new P1Parser();
}
