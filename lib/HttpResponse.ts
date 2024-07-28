import http from "http";
import fs from "fs";
import assert from "assert";

export default class HttpResponse {
    private res: http.ServerResponse;
    private req: http.IncomingMessage;

    constructor(
        request: http.IncomingMessage,
        serverReponse: http.ServerResponse,
    ) {
        this.res = serverReponse;
        this.req = request;
    }

    status(code: number): HttpResponse {
        this.res.statusCode = code;
        return this;
    }

    // type(type: MIMEType): void {
    //     //
    // }

    send(content: string): void {
        assert(typeof content === "string", "Argument must be of type: string");

        this.res.setHeader("Content-Type", "text/plain");
        this.res.end(content);
    }

    sendStatus(code: number): void {
        this.res.statusCode = code;
        this.res.end(code);
    }

    json<T extends object>(content: T): void {
        this.res.setHeader("Content-Type", "application/json");
        this.res.end(JSON.stringify(content));
    }

    sendFile(route: string): void {
        const file = fs.readFileSync(route, "utf-8");
        this.res.setHeader("Content-Type", "text/html");
        this.res.end(file);
    }

    redirect(initRoute: string): void {
        let route = initRoute;

        /* Redirect to path relative to the requesting URL by not prefixing
         * with '/' */
        if (!route.startsWith("/")) {
            route = this.req.url + "/" + route;
        }

        this.res.writeHead(302, {
            location: route,
        });

        this.res.end(initRoute);
    }
}
