<p>
<a href="https://github.com/danielgelling/p1-monitor/actions/workflows/test-suite.yaml"><img alt="Test suite" src="https://github.com/danielgelling/p1-monitor/actions/workflows/test-suite.yaml/badge.svg?branch=master" /></a>
<a href="https://github.com/danielgelling/p1-monitor/actions/workflows/test-suite.yaml"><img alt="Test suite" src="https://img.shields.io/github/issues-raw/danielgelling/p1-monitor" /></a>
<a href="https://www.npmjs.com/package/p1-monitor"><img alt="Downloads" src="https://img.shields.io/npm/dt/p1-monitor" /></a>
<a href="https://www.npmjs.com/package/p1-monitor/v/latest?activeTab=versions"><img alt="Latest version" src="https://img.shields.io/npm/v/p1-monitor" /></a>
<a href="https://github.com/danielgelling/p1-monitor/blob/master/LICENSE"><img alt="License: MIT" src="https://img.shields.io/npm/l/p1-monitor" /></a>
</p>

# About

This project provides a simple library for reading data from a smart meter using
its [P1 port](https://nl.wikipedia.org/wiki/P1-poort). It is written to be used
with a [P1 cable](https://www.sossolutions.nl/slimme-meter-kabel) that transmits
the P1 telegrams as a serial message over USB.

Those messages are then converted into a [structured object](https://github.com/danielgelling/p1-monitor/blob/master/src/P1Packet.ts)
and emitted as an event.


# Getting started

## Installation

Install the library using npm:

```bash
npm install danielgelling/p1-monitor
```

Now we can create a new `P1Monitor` instance by calling the factory function:

```ts
import { createP1Monitor } from 'p1-monitor';

const monitor = createP1Monitor({
    port: '/dev/ttyUSB0',
    baudRate: 115200,
});
```

Before we start receiving events, we need to call the `start` method on the monitor:

```ts
monitor.start();
```

## Usage

The `P1Monitor` will emit the following events:
- `connected`: Emitted when the first message is received by the P1 monitor.
- `data`: Emitted when a new message is received on the serial port.
- `error`: Emitted when an error occurs.
- `close`: Emitted when the serial port connection is closed.

The `data` is emitted with a [`P1Packet`](https://github.com/danielgelling/p1-monitor/blob/master/src/P1Packet.ts)
object as its argument, which will look something like:

```ts
{
    "vendor_id": "Ene",
    "model_id": "XS210 ESMR 5.0",
    "version": "50",
    "transmitted_at": "2024-01-06T10:19:56.000Z",
    "electricity": {
        "equipment_id": "E1234567891234567",
        "tariff": 1,
        "received": {
            "tariff1": 2601.66, // kWh
            "tariff2": 2960.167, // KWh
            "active": 0.279 // kW
        },
        "delivered": {...},
        "active": {...},
        "failures": {...},
        "sags": {...},
        "swells": {...}
    },
    "gas": {
        "equipment_id": "G1234567891234567",
        "measured_at": "2024-01-06T10:15:00.000Z",
        "received": 5472.258 // m3
    }
}
```
