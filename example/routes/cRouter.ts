import Router from "../../lib/Router";
import { Next, Req, Res } from "../../lib/types";

const cRouter = new Router();
cRouter.debug = true;

cRouter.get("/", (req: Req, res: Res, next: Next) => {
    res.status(200).send("/a/b/c");
});

cRouter.get("/foo", (req: Req, res: Res) => {
    res.status(200).send("/a/b/c/foo");
});

export default cRouter;
