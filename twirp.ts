import {AxiosError, AxiosInstance, AxiosResponse} from 'axios';
import {Message, Method, rpc, RPCImpl, RPCImplCallback} from 'protobufjs';

class TwirpError implements Error {
    public name = 'TwirpError';

    constructor(public code:string,public message: string,public meta:{[key:string]:string}) {
        if (typeof console !== 'undefined') {
            console.log(`name: ${this.name}, message: ${this.message}, code:${this.code}`)
        }
    }
    toString() {
        return `${this.name} ${this.message} ${this.code} ${this.meta}`;
    }
}

const getTwirpError = (err: AxiosError): { message: string; code: string; meta: {},name:string} => {
    const resp = err.response;
    let twirpError = {
        code: 'unknown',
        message: 'unknown error',
        meta: {},
        name:''
    };

    if (resp) {
        const headers = resp.headers;
        const data = resp.data;

        if (headers['content-type'] === 'application/json') {
            let s = data.toString();

            if (s === "[object ArrayBuffer]") {
                s = new TextDecoder("utf-8").decode(new Uint8Array(data));
            }

            try {
                twirpError = JSON.parse(s);
                throw new TwirpError(twirpError.code,twirpError.message,twirpError.meta)
            } catch (e) {
                twirpError.message = `JSON.parse() error: ${e.toString()}`
            }
        }
    }

    return twirpError;
};

export const createTwirpAdapter = (axios: AxiosInstance, methodLookup: (fn: any) => string): RPCImpl => {
    return (method: Method | rpc.ServiceMethod<Message<{}>,Message<{}>>, requestData: Uint8Array, callback: RPCImplCallback) => {
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
        .then((resp: AxiosResponse<Uint8Array|ArrayBuffer>) => {
            callback(null, new Uint8Array(resp.data));

        })
        .catch((err: AxiosError) => {
            callback(getTwirpError(err), null);
        });
    };
};
