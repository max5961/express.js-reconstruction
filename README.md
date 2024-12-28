Reverse engineering a clone of the Express.js framework in TypeScript.  This is
a fun project meant to deepen my understanding of Express.  This is not meant to
be used as a drop in replacement.

---

## How it works

### Routing and Layers

In Express, all objects that have access to routing methods such as `use` and
`get`, are **Router** objects.  This includes the *app* variable returned from
calling the default import function.
```typescript
export default class Router extends EventEmitter {
    public stack: Layer[];
    public base: string;
    public routers: Router[];
    /* ...Router implementation */
```
If you've used Express, then you likely know that the order in which middleware
and routing methods are called is important.  Based on looking at the way a
server is written in Express, I feel like I constantly need to remind myself
that routing methods are *not* re-executed every time the server receives a
request.  It might *appear* that way, but thats just part of the useful
abstraction Express provides us.  We know that scripts don't just re-execute
themselves.

Router methods are only called *once*, which is during the initial execution of
the script and their sole purpose is to configure the Router that calls them.
They do this by creating and pushing **Layer** objects to their own layer stack.
The layer stack creates what is commonly referred to as the *middleware stack*.

```typescript
class Layer {
    public route!: string | null;
    public method!: AppMethod;
    public handler!: Handler | null;
    public errorHandler!: ErrorHandler | null;
    public routerHandler!: RouterHandler | null;
    /* ... Layer implementation ... */
```

```typescript
app.get("/foo", (req, res) => { res.status(200).send("foo") });
app.get("/bar", (req, res) => { res.status(200).send("bar") });

/*
   * After these operations, the app's layer stack might look something like this:
   * [ fooLayer, barLayer ]
*/
```

On each http request event, the root Router (usually called **app**) will
respond by iterating through its Layer stack, executing the first Layer's
handler that matches the Request's route and method.  Unless the *next* callback
is executed in the handler this ends the process until the next Request.  This
is why the *next* function and the order in which routing methods are called is
important to creating a predictable server response.

---

### Router `dispatch` method

This function does most of the heavy lifting every time the server receives a
new http request.  It is the core of Express in my opinion and understanding and
writing this function gave me a newfound appreciation for and opened my eyes to
the possibilities of *function closure*.

I originally tried to tackle the job of responding to http requests with my own
independent approach. I tried to keep properties that kept track of the current
index within the layer stack.  This ended up being very difficult to scale,
especially when handling nested Routers.  In hindsight, due to the asynchronous
nature of most express middleware, for-loop style iteration doesn't really make
much sense.  After my initial approach failed, I rewrote the dispatch function
by closely following the Express source code, which uses closure to handle
iteration over the layer stack.

The is a somewhat simplified version of my implementation of the dispatch
function.

```typescript
dispatch = (req: Req, res: Res, done: Next) => {
    let idx = 0;

    const next = (err?: HttpError) => {
        if (this.stack.length === 0) {
            return done(err);
        }

        // Due to closure holding onto the idx variable, iteration is handled
        // automatically.  We don't need to manually handle anything.
        const layer = this.stack[idx++];

        // We are at the end of the stack, exit back to the parent router (or default handler)
        if (!layer) {
            return done(err);
        }

        // This layer was created with a Router.  Calling routerHandler returns
        // a handler that calls 'dispatch', but first we need to scope in the
        // 'err' variable.
        if (layer.routerHandler) {
            const handler = layer.routerHandler(err) as Handler;
            layer.addHandler(handler);
        }

        // Layers that don't handle routes don't need to match the req method and url
        if (!layer.doesHandleRoutes()) {
            if (err && layer.errorHandler) {
                return layer.errorHandler(err, req, res, next);
            } else if (layer.handler) {
                return layer.handler(req, res, next);
            }
        }

        const match = this.isMatch(req, layer);

        // Errors fall through until the next error handler (or default handler
        // provided by the root 'done')
        if (match && !err) {
            return layer.handler && layer.handler(req, res, next);
        } else if (err) {
            next(err);
        } else {
            next();
        }
    }

    next();
}
```

The *dispatch* function has an inner function called `next` which captures the
`idx` variable through closure, which is used to recursively iterate over the
layers in the Router's layer stack.  Once the Router has iterated over all of
its layers, it calls the `done` function.  If the request falls all the way
through the layer stack, the  *done* function acts as a default handler. It
originates from the root Router and is created when the server receives an http
request.

How does this handle nested Routers though?  If the layer is created with a
Router such as with code like this...

```typescript
app.use("foo", fooRouter);
```

the layer will have a *routerHandler*, instead of a *handler* or *errorHandler*.
The routerHandler function exists to create a new handler that is given access
to the the *err* variable.  The handler that is created calls the nested
Router's own dispatch function.  This ensures that nested Routers can properly
propagate errors.

```typescript
handleUseRouter(route: string | undefined, router: Router): void {
    this.routers.push(router);

    this.prependRouters(route || "");

    const routerHandler =
        (err?: HttpError) => (req: Req, res: Res, done: Next) => {
            if (err) {
                router.dispatch(req, res, () => done(err));
            } else {
                router.dispatch(req, res, done);
            }
        };

    const layer = new Layer().addRouterHandler(routerHandler);

    this.stack.push(layer);
}
```
This special handler is created *before* the *next* function starts executing
handlers.  A few lines down in the *next* function, this *nested dispatch*
function is called and it inherits its *done* function from the *next* function
that called it.  This way, if/when the nested Router finishes iterating over all
of its layers, its own *done* function is called, which seamlessly continues to
iterate over the layers that come after the nested Router.

**NOTE:** You might notice that this implementation doesn't guard against a
stack overflow in the case of a large amount of handlers.  I left this part out
since I didn't feel it was vital to understanding how the function works.
However, this is handled by using *setImmediate* after a certain number of
iterations to wait until the call stack is empty before continuing to call
*next*.

```typescript
if (++sync > 100) {
    return setImmediate(next, err);
}
```

**NOTE:** *I left out the handling of passing 'router' or 'route' to the
next/done functions because I'm still confused by how the Express source code
handles this.  While my code should replicate very similar functionality, I
don't think fully replicating that level of granularity necessarily adds much
more to my understanding*

---

## Entry Points

























