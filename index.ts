import http from "http";
import fs from "node:fs";
import path from "node:path";

import EventEmitter from "node:events";
import DB from "./db";

type HttpRequest = http.IncomingMessage;
type HttpResponse = http.ServerResponse;
type Next = () => void;

type Handler = (req: HttpRequest, res: Response, next?: Next) => void;
type NextHandler = (req: HttpRequest, res: Response, next: Next) => void;

type Method = "get" | "post" | "put" | "delete" | "use";
type Stack = Layer[];

class Response {
    private res: HttpResponse;

    constructor(httpResponse: HttpResponse) {
        this.res = httpResponse;
    }

    status(code: number): Response {
        this.res.statusCode = code;
        return this;
    }

    send(content: string): void {
        if (typeof content !== "string") {
            throw new Error("Invalid argument");
        }

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

class Layer {
    public path!: string | null;
    public method!: Method;
    public handler!: NextHandler;

    constructor() {
        this.path = null;
    }

    addPath(path: string): Layer {
        this.path = path;
        return this;
    }

    addMethod(method: Method): Layer {
        this.method = method;
        return this;
    }

    addHandler(handler: Handler): Layer {
        this.handler = (req: HttpRequest, res: Response, next: Next) => {
            handler(req, res, next);
        };
        return this;
    }

    isRoute(): boolean {
        return this.path !== null;
    }
}

type RouteMethod = (path: string, handler: Handler) => void;
type Middleware = (handler: Handler) => void;
class App extends EventEmitter {
    // private stack: Stack;
    // private idx: number;
    // private req!: HttpRequest;
    // private res!: Response;
    public stack: Stack;
    public idx: number;
    public req!: HttpRequest;
    public res!: Response;

    public get!: RouteMethod;
    public post!: RouteMethod;
    public put!: RouteMethod;
    public delete!: RouteMethod;
    public use!: Middleware;

    constructor() {
        super();
        this.stack = [];
        this.idx = 0;
        this.start = this.start.bind(this);
    }

    static IncomingRequest = "INCOMING_REQUEST";

    reset = (): void => {
        this.idx = 0;
    };

    next = (): void => {
        if (this.idx >= this.stack.length) {
            return this.res.status(404).send("Page cannot be found");
        }

        const layer = this.stack[this.idx++] as Layer;

        if (!layer.isRoute()) {
            return layer.handler(this.req, this.res, this.next);
        }

        const match = this.isMatch({
            path: layer.path!,
            method: layer.method,
        });

        if (match) {
            layer.handler(this.req, this.res, this.next);
        } else {
            this.next();
        }
    };

    isMatch = ({ path, method }: { path: string; method: Method }): boolean => {
        return (
            this.req.url === path && this.req.method === method.toUpperCase()
        );
    };

    start = (req: HttpRequest, res: HttpResponse): void => {
        this.req = req;
        this.res = new Response(res);
        this.emit(App.IncomingRequest);
    };

    listen = (port: number, cb?: () => any): void => {
        const server = http.createServer(this.start);
        server.listen(port, cb);
    };

    /* This will unfortunately cause bugs as is....it will successfully push
     * the handlers to the stack.  However, it will also push the return handler
     * to the stack as well which means it should work actually right???....... */
    static = (filePath: string, config?: { routePath: string }): Handler => {
        const files = fs.readdirSync(filePath, "utf-8");

        for (const file of files) {
            let routePath = file === "index.html" ? "/" : "/" + file;

            if (config) {
                routePath = config.routePath + routePath;
            }

            if (routePath.endsWith("/")) {
                routePath = routePath.slice(0, routePath.length - 1);
            }

            const method = "get";
            const handler = (req: HttpRequest, res: Response): void => {
                res.status(200).sendFile(path.resolve(filePath, file));
            };

            this.stack.push(
                new Layer()
                    .addPath(routePath)
                    .addMethod(method)
                    .addHandler(handler),
            );
        }

        return (req: HttpRequest, res: Response, next: Next): void => {
            next();
        };
    };

    json = (): Handler => {
        return (req: HttpRequest, res: Response, next: Next): void => {
            next();
        };
    };
}

// This would be a good place for a function overload...
(["get", "post", "put", "delete", "use"] as Method[]).forEach((method) => {
    App.prototype[method] = function (
        pathOrHandler: string | Handler,
        handler?: Handler,
    ): void {
        if (typeof pathOrHandler === "string" && !handler) {
            throw new Error("Missing route handling argument");
        }

        const stack = this.stack as Stack;

        let path: string | Handler;
        const layer = new Layer().addMethod(method);

        if (typeof pathOrHandler === "string") {
            path = pathOrHandler;

            layer.addPath(path).addHandler(handler!);
        } else {
            layer.addHandler(pathOrHandler);
        }

        stack.push(layer);
    };
});

function createApplication(): App {
    const app = new App();

    app.on(App.IncomingRequest, () => {
        app.reset();
        app.next();
    });

    return app;
}

const app = createApplication();

// Logger middleware
app.use((req: HttpRequest, res: Response, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next();
});

app.use(
    app.static(path.resolve("views"), {
        routePath: "/homepage",
    }),
);

app.get("/", (req: HttpRequest, res: Response) => {
    res.status(200).json({ hello: "world" });
});

app.get("/api", (req: HttpRequest, res: Response) => {
    res.status(200).json({ foo: "bar" });
});

app.get("/users", (req: HttpRequest, res: Response) => {
    res.status(200).send("hello world");
});

app.listen(5000, () => {
    console.log("Server listening on port 5000");
});
