import App from "./App";
import ejs from "ejs";
import http from "http";
import fs from "fs";
import assert from "assert";

export default class HttpResponse {
    private res: http.ServerResponse;
    private req: http.IncomingMessage;
    private app: App;

    constructor(
        request: http.IncomingMessage,
        serverReponse: http.ServerResponse,
        app: App,
    ) {
        this.res = serverReponse;
        this.req = request;
        this.app = app;
    }

    status(code: number): HttpResponse {
        this.res.statusCode = code;
        return this;
    }

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

    sendFile(fpath: string): void {
        const file = fs.readFileSync(fpath, "utf-8");
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

    render(fname: string, config: { [key: string]: any }): void {
        const viewsDir: string | null = this.app.getSetting("views");
        assert(viewsDir, "Must set views directory before calling render");

        const templateFile = fs.readFileSync(
            `${viewsDir}/${fname}.ejs`,
            "utf-8",
        );

        const html = ejs.render(templateFile, config);

        this.res.setHeader("Content-Type", "text/html");
        this.res.end(html);
    }
}
