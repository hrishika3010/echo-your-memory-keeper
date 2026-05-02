import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { createRuntimeContainer } from "../lib/container.js";

const { env, service } = await createRuntimeContainer();

serve(
  {
    fetch: createApp(service).fetch,
    port: env.PORT
  },
  (info) => {
    console.log(`The Roll API listening on http://localhost:${info.port}`);
  }
);
