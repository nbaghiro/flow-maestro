// Message Operations
export { listMessagesOperation, executeListMessages, listMessagesSchema } from "./listMessages";
export type { ListMessagesParams } from "./listMessages";

export { getMessageOperation, executeGetMessage, getMessageSchema } from "./getMessage";
export type { GetMessageParams } from "./getMessage";

export { sendMessageOperation, executeSendMessage, sendMessageSchema } from "./sendMessage";
export type { SendMessageParams } from "./sendMessage";

export {
    replyToMessageOperation,
    executeReplyToMessage,
    replyToMessageSchema
} from "./replyToMessage";
export type { ReplyToMessageParams } from "./replyToMessage";

export {
    forwardMessageOperation,
    executeForwardMessage,
    forwardMessageSchema
} from "./forwardMessage";
export type { ForwardMessageParams } from "./forwardMessage";

export { modifyMessageOperation, executeModifyMessage, modifyMessageSchema } from "./modifyMessage";
export type { ModifyMessageParams } from "./modifyMessage";

export { trashMessageOperation, executeTrashMessage, trashMessageSchema } from "./trashMessage";
export type { TrashMessageParams } from "./trashMessage";

export {
    untrashMessageOperation,
    executeUntrashMessage,
    untrashMessageSchema
} from "./untrashMessage";
export type { UntrashMessageParams } from "./untrashMessage";

// Thread Operations
export { listThreadsOperation, executeListThreads, listThreadsSchema } from "./listThreads";
export type { ListThreadsParams } from "./listThreads";

export { getThreadOperation, executeGetThread, getThreadSchema } from "./getThread";
export type { GetThreadParams } from "./getThread";

export { modifyThreadOperation, executeModifyThread, modifyThreadSchema } from "./modifyThread";
export type { ModifyThreadParams } from "./modifyThread";

export { trashThreadOperation, executeTrashThread, trashThreadSchema } from "./trashThread";
export type { TrashThreadParams } from "./trashThread";

// Label Operations
export { listLabelsOperation, executeListLabels, listLabelsSchema } from "./listLabels";
export type { ListLabelsParams } from "./listLabels";

export { createLabelOperation, executeCreateLabel, createLabelSchema } from "./createLabel";
export type { CreateLabelParams } from "./createLabel";

export { updateLabelOperation, executeUpdateLabel, updateLabelSchema } from "./updateLabel";
export type { UpdateLabelParams } from "./updateLabel";

export { deleteLabelOperation, executeDeleteLabel, deleteLabelSchema } from "./deleteLabel";
export type { DeleteLabelParams } from "./deleteLabel";

// Attachment Operations
export { getAttachmentOperation, executeGetAttachment, getAttachmentSchema } from "./getAttachment";
export type { GetAttachmentParams } from "./getAttachment";
