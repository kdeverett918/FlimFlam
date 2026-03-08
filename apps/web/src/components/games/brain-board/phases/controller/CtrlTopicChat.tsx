"use client";

import { BrainBoardChat } from "@/components/controls/BrainBoardChat";
import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import type { BrainBoardGameState } from "../../shared/bb-types";

export interface CtrlTopicChatProps {
  topicPreview: string[];
  chatMessages: NonNullable<BrainBoardGameState["chatMessages"]>;
  players: PlayerData[];
  mySessionId: string | null;
  onSendMessage: (message: string) => void;
  timerEndsAt: number;
  serverTimeOffset: number;
}

export function CtrlTopicChat({
  topicPreview,
  chatMessages,
  players,
  mySessionId,
  onSendMessage,
  timerEndsAt,
  serverTimeOffset,
}: CtrlTopicChatProps) {
  return (
    <div className="flex flex-col gap-2 pb-4 pt-2" style={{ minHeight: "240px" }}>
      {topicPreview.length > 0 && (
        <GlassPanel className="mx-2 mb-1 px-3 py-3">
          <p className="font-display text-[11px] font-bold uppercase tracking-wider text-accent-brainboard">
            We Heard
          </p>
          <div data-testid="brainboard-topic-chips" className="mt-2 flex flex-wrap gap-2">
            {topicPreview.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-accent-brainboard/30 bg-accent-brainboard/10 px-2.5 py-1 font-body text-xs text-accent-brainboard"
              >
                {topic}
              </span>
            ))}
          </div>
        </GlassPanel>
      )}
      <BrainBoardChat
        messages={chatMessages ?? []}
        players={players}
        mySessionId={mySessionId}
        onSendMessage={onSendMessage}
        timerEndsAt={timerEndsAt}
        serverTimeOffset={serverTimeOffset}
      />
    </div>
  );
}
