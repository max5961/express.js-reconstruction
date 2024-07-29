import http from "http";
import Router from "./Router";

export default class App extends Router {
    private settings: { [key: string]: string };

    constructor() {
        super();
        this.settings = {};
    }

    static IncomingRequest: string = "INCOMING_REQUEST";

    set(key: string, val: string): void {
        this.settings[key] = val;
    }

    getSetting(key: string): string | null {
        return this.settings[key] || null;
    }

    startResponse = (
        req: http.IncomingMessage,
        res: http.ServerResponse,
    ): void => {
        this.emit(App.IncomingRequest, req, res);
    };

    listen = (port: number, cb?: () => any): void => {
        const server = http.createServer(this.startResponse);
        server.listen(port, cb);
    };
}
