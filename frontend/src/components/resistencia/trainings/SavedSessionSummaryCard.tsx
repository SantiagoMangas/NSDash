import type {
  HiitContinuoCalculateResponse,
  HiitCortoCalculateResponse,
  HiitLargoCalculateResponse,
  MasTrainingCalculateResponse,
  RsaCalculateResponse,
} from "@/lib/api/sessions";
import {
  HiitContinuoSessionSummaryCard,
  HiitCortoSessionSummaryCard,
  HiitLargoSessionSummaryCard,
  RsaSessionSummaryCard,
} from "./HiitRsaSummaryCards";
import { MasTrainingSessionSummaryCard } from "./MasTrainingSessionSummaryCard";
import { TempoRunSessionSummaryCard, type TempoRunSavedSnapshot } from "./TempoRunSessionSummaryCard";

type SavedSnapshot = {
  source: string;
  request: Record<string, unknown>;
  result: Record<string, unknown>;
};

type Props = {
  snapshot: SavedSnapshot;
  showSavedBanner?: boolean;
};

export function SavedSessionSummaryCard({ snapshot, showSavedBanner = true }: Props) {
  const { source, request, result } = snapshot;
  const ratio = typeof request.ratio === "string" ? request.ratio : "";

  if (source === "mas_training") {
    return (
      <MasTrainingSessionSummaryCard
        snapshot={{ result: result as MasTrainingCalculateResponse, ratio, request }}
        showSavedBanner={showSavedBanner}
      />
    );
  }

  if (source === "tempo_run") {
    const tempoSnapshot: TempoRunSavedSnapshot = {
      result: result as TempoRunSavedSnapshot["result"],
      ratio,
    };
    return <TempoRunSessionSummaryCard snapshot={tempoSnapshot} showSavedBanner={showSavedBanner} />;
  }

  if (source === "rsa") {
    return (
      <RsaSessionSummaryCard
        result={result as RsaCalculateResponse}
        request={request}
        showSavedBanner={showSavedBanner}
      />
    );
  }

  if (source === "hiit_corto") {
    return (
      <HiitCortoSessionSummaryCard
        result={result as HiitCortoCalculateResponse}
        request={request}
        showSavedBanner={showSavedBanner}
      />
    );
  }

  if (source === "hiit_largo") {
    return (
      <HiitLargoSessionSummaryCard
        result={result as HiitLargoCalculateResponse}
        request={request}
        showSavedBanner={showSavedBanner}
      />
    );
  }

  if (source === "hiit_continuo_largo" || source === "hiit_continuo_corto") {
    return (
      <HiitContinuoSessionSummaryCard
        result={result as HiitContinuoCalculateResponse}
        request={request}
        showSavedBanner={showSavedBanner}
      />
    );
  }

  return null;
}