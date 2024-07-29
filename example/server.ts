import path from "path";
import express, { Req, Res, HttpError, Next } from "../lib/express";
import aRouter from "./routes/aRouter";
const app = express();

// Logger middleware
app.use((req: Req, res: Res, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded());

app.get("/", (req: Req, res: Res) => {
    if (req.body) {
        return res.status(200).json(req.body);
    }
    res.status(200).send("root");
});

app.use("/homepage", app.static(path.resolve("./example/views")));

app.use("/a", aRouter);

app.post("/foo", async (req: Req, res: Res) => {
    console.log(req.body);

    res.status(200).json({ foo: "bar" });
});

app.get("/bro", (req: Req, res: Res, next: Next) => {
    res.status(200).send("bro");
});

app.use((err: HttpError, req: Req, res: Res, next: Next) => {
    let msg: string | HttpError = err;
    if (typeof err !== "string") {
        msg = `Error Message: ${err.message}`;
    }
    res.status(500).send(msg as string);
});

export default app;
