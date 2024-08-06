import express, { Req, Res, HttpError, Next } from "../lib/express";
import path from "node:path";

const app = express();

// Logger middleware
app.use((req: Req, res: Res, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next("route");
});

app.use(express.json());
app.use(express.urlencoded());

app.set("views", path.resolve("./example/views"));

app.get("/", (_: Req, res: Res) => {
    res.redirect("/items");
});

app.use((err: HttpError, req: Req, res: Res, next: Next) => {
    res.status(500).send(err.stack || "");
});

export default app;
