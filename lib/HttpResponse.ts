import http from "http";
import fs from "fs";
import assert from "assert";

export default class HttpResponse {
    private res: http.ServerResponse;

    constructor(serverReponse: http.ServerResponse) {
        this.res = serverReponse;
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

    json<T extends object>(content: T): void {
        this.res.setHeader("Content-Type", "application/json");
        this.res.end(JSON.stringify(content));
    }

    sendFile(path: string): void {
        const file = fs.readFileSync(path, "utf-8");
        this.res.setHeader("Content-Type", "text/html");
        this.res.end(file);
    }
}
