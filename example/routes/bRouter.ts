import Router from "../../lib/Router";
import { Next, Req, Res } from "../../lib/types";
import cRouter from "./cRouter";

const bRouter = new Router();
// bRouter.debug = true;

bRouter.get("/", (req: Req, res: Res, next: Next) => {
    res.status(200).send("/a/b");
});

bRouter.get("/foo", (req: Req, res: Res) => {
    res.status(200).send("/a/b/foo");
});

bRouter.use("/c", cRouter);

export default bRouter;
