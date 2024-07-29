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
// app.use(express.urlencoded());

app.get("/", (req: Req, res: Res) => {
    throw new Error("brodude");
    res.status(200).send("root");
});

app.use("/homepage", app.static(path.resolve("./example/views")));

app.use("/a", aRouter);

app.post("/foo", async (req: Req, res: Res) => {
    console.log(req.body);

    res.status(200).json({ foo: "bar" });
});

app.use((err: HttpError, req: Req, res: Res, next: Next) => {
    console.log("app.use error handler");
    res.status(500).send("error message placeholder");
});

export default app;
