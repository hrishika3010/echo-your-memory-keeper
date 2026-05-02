import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

import { createRuntimeContainer, registerJobHandlers } from "../lib/container.js";
import { handleSpectrumMessage, NoActiveAlbumError } from "../lib/services/roll-service.js";

const { env, service, queue } = await createRuntimeContainer();
await queue.start();
await registerJobHandlers(service, queue);

const app = await Spectrum({
  projectId: env.PHOTON_PROJECT_ID,
  projectSecret: env.PHOTON_PROJECT_SECRET,
  providers: [imessage.config()]
});

for await (const [space, message] of app.messages) {
  try {
    await handleSpectrumMessage(service, space, message);
  } catch (error) {
    if (error instanceof NoActiveAlbumError) {
      await space.send("No active album is configured yet.");
      continue;
    }

    console.error("Failed to handle Photon message", error);
    await space.send("We received your image, but processing failed.");
  }
}
