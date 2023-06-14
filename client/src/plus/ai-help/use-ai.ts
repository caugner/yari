// Source: https://github.com/supabase/supabase/blob/0f1254252f6b066e088a40617f239744e3a1e22b/packages/ui/src/components/Command/AiCommand.tsx
// License: Apache 2.0 - https://github.com/supabase/supabase/blob/0f1254252f6b066e088a40617f239744e3a1e22b/LICENSE
import type {
  ChatCompletionResponseMessage,
  CreateChatCompletionResponse,
  CreateChatCompletionResponseChoicesInner,
} from "openai";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { SSE } from "sse.js";
import useSWR from "swr";

type CreateChatCompletionResponseChoicesInnerDelta = Omit<
  CreateChatCompletionResponseChoicesInner,
  "message"
> & {
  delta: Partial<ChatCompletionResponseMessage>;
};

export enum MessageRole {
  User = "user",
  Assistant = "assistant",
}

export enum MessageStatus {
  Pending = "pending",
  InProgress = "in-progress",
  Complete = "complete",
  Stopped = "stopped",
}

export interface Message {
  role: MessageRole;
  content: string;
  status: MessageStatus;
  sources?: PageReference[];
}

interface NewMessageAction {
  type: "new";
  message: Message;
}

interface UpdateMessageAction {
  type: "update";
  index: number;
  message: Partial<Message>;
}

interface AppendContentAction {
  type: "append-content";
  index: number;
  content: string;
}

interface SetSourcesAction {
  type: "set-sources";
  index: number;
  sources: PageReference[];
}

interface ResetAction {
  type: "reset";
}

type MessageAction =
  | NewMessageAction
  | UpdateMessageAction
  | AppendContentAction
  | ResetAction
  | SetSourcesAction;

interface PageReference {
  slug: string;
  title: string;
}

interface Quota {
  used: number;
  remaining: number;
  limit: number;
}

function messageReducer(state: Message[], messageAction: MessageAction) {
  let current = structuredClone(state);
  const { type } = messageAction;

  switch (type) {
    case "new": {
      const { message } = messageAction;
      current.push(message);
      break;
    }
    case "update": {
      const { index, message } = messageAction;
      if (current[index]) {
        Object.assign(current[index], message);
      }
      break;
    }
    case "append-content": {
      const { index, content } = messageAction;
      if (current[index]) {
        current[index].content += content;
      }
      break;
    }
    case "set-sources": {
      const { index, sources } = messageAction;
      if (current[index]) {
        current[index].sources = sources;
      }
      break;
    }
    case "reset": {
      current = [];
      break;
    }
    default: {
      throw new Error(`Unknown message action '${type}'`);
    }
  }

  return current;
}

class AiHelpStorage {
  static KEY = "ai-help";

  private static get value() {
    return JSON.parse(window.localStorage.getItem(this.KEY) ?? "{}");
  }

  private static mutate(partial) {
    window.localStorage.setItem(
      this.KEY,
      JSON.stringify({
        ...this.value,
        ...partial,
      })
    );
  }

  static get messages() {
    return this.value?.messages ?? [];
  }

  static set messages(messages) {
    this.mutate({ messages });
  }
}

export interface UseAiChatOptions {
  messageTemplate?: (message: string) => string;
  setIsLoading?: Dispatch<SetStateAction<boolean>>;
}

export function useAiChat({
  messageTemplate = (message) => message,
  setIsLoading,
}: UseAiChatOptions) {
  const eventSourceRef = useRef<SSE>();

  const [isResponding, setIsResponding] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [currentMessageIndex, setCurrentMessageIndex] = useState(1);
  const [messages, dispatchMessage] = useReducer(
    messageReducer,
    AiHelpStorage.messages
  );

  const [quota, setQuota] = useState<Quota | null | undefined>(undefined);
  const remoteQuota = useRemoteQuota();

  useEffect(() => {
    AiHelpStorage.messages = messages;
  }, [messages]);

  useEffect(() => {
    if (remoteQuota) {
      setQuota(remoteQuota);
    }
  }, [remoteQuota]);

  const submit = useCallback(
    async (query: string) => {
      dispatchMessage({
        type: "new",
        message: {
          status: MessageStatus.Complete,
          role: MessageRole.User,
          content: query,
        },
      });
      dispatchMessage({
        type: "new",
        message: {
          status: MessageStatus.Pending,
          role: MessageRole.Assistant,
          content: "",
        },
      });
      setIsResponding(false);
      setHasError(false);
      setIsLoading?.(true);

      const eventSource = new SSE(`/api/v1/plus/ai/ask`, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        payload: JSON.stringify({
          messages: messages
            .filter(({ status }) => status === MessageStatus.Complete)
            .map(({ role, content }) => ({ role, content }))
            .concat({
              role: MessageRole.User,
              content: messageTemplate(query),
            }),
        }),
      });

      function handleError<T>(err: T) {
        setIsLoading?.(false);
        setIsResponding(false);
        setHasError(true);
        console.error(err);
      }

      eventSource.addEventListener("error", handleError);
      eventSource.addEventListener("message", (e) => {
        try {
          setIsLoading?.(false);

          dispatchMessage({
            type: "update",
            index: currentMessageIndex,
            message: {
              status: MessageStatus.InProgress,
            },
          });

          setIsResponding(true);

          const data = JSON.parse(e.data);

          if (data.type === "metadata") {
            const { sources = undefined, quota = undefined } = data;
            // Sources.
            if (Array.isArray(sources)) {
              dispatchMessage({
                type: "set-sources",
                index: currentMessageIndex,
                sources: sources,
              });
            }
            // Quota.
            if (typeof quota !== "undefined") {
              setQuota(quota);
            }
            return;
          } else if (!data.id) {
            console.warn("Received unsupported message", { data });
            return;
          }

          const completionResponse: CreateChatCompletionResponse = data;
          const [
            {
              delta: { content },
              finish_reason,
            },
          ] =
            completionResponse.choices as CreateChatCompletionResponseChoicesInnerDelta[];

          if (content) {
            dispatchMessage({
              type: "append-content",
              index: currentMessageIndex,
              content,
            });
          } else if (finish_reason === "stop") {
            setIsResponding(false);
            dispatchMessage({
              type: "update",
              index: currentMessageIndex,
              message: {
                status: MessageStatus.Complete,
              },
            });
            setCurrentMessageIndex((x) => x + 2);
          }
        } catch (err) {
          handleError(err);
        }
      });

      eventSource.stream();

      eventSourceRef.current = eventSource;

      setIsLoading?.(true);
    },
    [currentMessageIndex, messages, messageTemplate]
  );

  function useRemoteQuota() {
    const { data } = useSWR<Quota>("/api/v1/plus/ai/ask/quota", async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status} on ${url}: ${text}`);
      }
      const data = await response.json();
      return data.quota;
    });

    return data;
  }

  function stop() {
    eventSourceRef.current?.close();
    eventSourceRef.current = undefined;
    setIsResponding(false);
    setHasError(false);
    setIsResponding(false);
    dispatchMessage({
      type: "update",
      index: currentMessageIndex,
      message: {
        status: MessageStatus.Stopped,
      },
    });
    setCurrentMessageIndex((x) => x + 2);
  }

  function reset() {
    eventSourceRef.current?.close();
    eventSourceRef.current = undefined;
    setIsResponding(false);
    setHasError(false);
    dispatchMessage({
      type: "reset",
    });
  }

  return {
    submit,
    stop,
    reset,
    messages,
    isResponding,
    hasError,
    quota,
  };
}
