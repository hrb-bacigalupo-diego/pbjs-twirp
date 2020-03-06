"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TwirpError = /** @class */ (function () {
    function TwirpError(code, message, meta) {
        this.code = code;
        this.message = message;
        this.meta = meta;
        this.name = 'TwirpError';
        if (typeof console !== 'undefined') {
            console.log("name: " + this.name + ", message: " + this.message + ", code:" + this.code);
        }
    }
    TwirpError.prototype.toString = function () {
        return this.name + " " + this.message;
    };
    return TwirpError;
}());
var getTwirpError = function (err) {
    var resp = err.response;
    var twirpError = {
        code: 'unknown',
        message: 'unknown error',
        meta: {},
        name: ''
    };
    if (resp) {
        var headers = resp.headers;
        var data = resp.data;
        if (headers['content-type'] === 'application/json') {
            var s = data.toString();
            if (s === "[object ArrayBuffer]") {
                s = new TextDecoder("utf-8").decode(new Uint8Array(data));
            }
            try {
                twirpError = JSON.parse(s);
                throw new TwirpError(twirpError.code, twirpError.message, twirpError.meta);
            }
            catch (e) {
                twirpError.message = "JSON.parse() error: " + e.toString();
            }
        }
    }
    return twirpError;
};
exports.createTwirpAdapter = function (axios, methodLookup) {
    return function (method, requestData, callback) {
        axios({
            method: 'POST',
            url: methodLookup(method),
            headers: {
                'Content-Type': 'application/protobuf'
            },
            // required to get an arraybuffer of the actual size, not the 8192 buffer pool that protobuf.js uses
            // see: https://github.com/dcodeIO/protobuf.js/issues/852
            data: requestData.slice(),
            responseType: 'arraybuffer'
        })
            .then(function (resp) {
            callback(null, new Uint8Array(resp.data));
        })
            .catch(function (err) {
            callback(getTwirpError(err), null);
        });
    };
};
