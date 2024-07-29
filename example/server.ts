import path from "path";
import express, { Req, Res, HttpError, Next } from "../lib/express";
import aRouter from "./routes/aRouter";
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

// app.get("/", (req: Req, res: Res) => {
//     if (req.body) {
//         return res.status(200).json(req.body);
//     }
//     res.status(200).send("root");
// });

app.use("/homepage", express.static(path.resolve("./example/views")));
// app.use(express.static(path.resolve("./example/views")));

app.use("/a", aRouter);

app.post("/foo", async (req: Req, res: Res) => {
    console.log(req.body);

    res.status(200).json({ foo: "bar" });
});

app.get("/bro/:id/:foobar", (req: Req, res: Res, next: Next) => {
    console.log(req.params);

    res.status(200).json(req.params);
});

app.get("/views-test", (req: Req, res: Res, next: Next) => {
    res.status(200).render("index", {
        user: {
            name: "John",
        },
    });
});

app.use((err: HttpError, req: Req, res: Res, next: Next) => {
    res.status(500).send(err.stack || "");
});

export default app;
