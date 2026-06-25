export const FERIA_CHANNEL_NAME = "cova-feria-v1";

export type FeriaChannelMessage =
  | { type: "speak"; text: string }
  | { type: "interrupt" }
  | { type: "status"; status: "processing" | "idle" | "speaking" };

export function createFeriaChannel() {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(FERIA_CHANNEL_NAME);
}

export function postFeriaMessage(message: FeriaChannelMessage) {
  const channel = createFeriaChannel();
  channel?.postMessage(message);
  channel?.close();
}
