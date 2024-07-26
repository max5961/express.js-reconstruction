import http from "http";
import Router from "./Router";

export default class App extends Router {
    constructor() {
        super();
    }

    static IncomingRequest: string = "INCOMING_REQUEST";

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
