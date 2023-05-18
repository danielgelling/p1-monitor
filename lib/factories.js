"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createP1Parser = exports.createP1Monitor = void 0;
const P1Monitor_1 = require("./P1Monitor");
const P1Parser_1 = require("./P1Parser");
function createP1Monitor(options) {
    return new P1Monitor_1.P1Monitor(createP1Parser(options), options);
}
exports.createP1Monitor = createP1Monitor;
function createP1Parser(options) {
    return new P1Parser_1.P1Parser(options);
}
exports.createP1Parser = createP1Parser;
//# sourceMappingURL=factories.js.map