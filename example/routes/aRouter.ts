import express from "../../lib/express";
import { Next, Req, Res } from "../../lib/types";
import bRouter from "./bRouter";

const aRouter = new express.Router();

aRouter.get("/", (req: Req, res: Res, next: Next) => {
    res.status(200).send("/a");
});

aRouter.get("/foo", (req: Req, res: Res) => {
    res.status(200).send("/a/foo");
});

aRouter.use("/b", bRouter);

export default aRouter;
