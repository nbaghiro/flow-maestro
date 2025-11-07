import { FastifyInstance } from "fastify";
import { createTriggerRoute } from "./create";
import { listTriggersRoute } from "./list";
import { getTriggerRoute } from "./get";
import { updateTriggerRoute } from "./update";
import { deleteTriggerRoute } from "./delete";
import { webhookReceiverRoute } from "./webhook";
import { phoneCallWebhookRoute } from "./phone-call-webhook";
import { executeTriggerRoute } from "./execute";

export async function triggerRoutes(fastify: FastifyInstance) {
    // Webhook receiver routes (PUBLIC - no auth)
    fastify.register(
        async (instance) => {
            instance.register(webhookReceiverRoute);
            instance.register(phoneCallWebhookRoute);
        },
        { prefix: "/webhooks" }
    );

    // Trigger management routes (requires auth)
    fastify.register(
        async (instance) => {
            instance.register(createTriggerRoute);
            instance.register(listTriggersRoute);
            instance.register(getTriggerRoute);
            instance.register(updateTriggerRoute);
            instance.register(deleteTriggerRoute);
            instance.register(executeTriggerRoute);
        },
        { prefix: "/triggers" }
    );
}
