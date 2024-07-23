import { HttpRequest, Next } from "./lib/types";
import HttpResponse from "./lib/HttpResponse";
import path from "node:path";
import express from "./lib/App";
import fs from "fs/promises";

const app = express();

// Logger middleware
app.use((req: HttpRequest, res: HttpResponse, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next();
});

// app.use(
//     app.static(path.resolve("views"), {
//         routePath: "/homepage",
//     }),
// );

app.get("/", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).json({ hello: "world" });
});

app.get("/api", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).json({ foo: "bar" });
});

app.get("/users", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).send("hello world");
});

app.listen(5000, () => {
    console.log("Server listening on port 5000");
});
