import { Modal, Button } from "@heroui/react";
import RarityBadge from "./RarityBadge";
import { positionAndJersey } from "../../utils/jerseyDisplay";
import type { AthleteDetail } from "../../types";

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: AthleteDetail | null;
  isLoading: boolean;
}

export default function PlayerStatsModal({
  isOpen,
  onClose,
  athlete,
  isLoading,
}: PlayerStatsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop variant="blur">
        <Modal.Container size="lg" className="w-[min(100%,36rem)] max-w-2xl">
          <Modal.Dialog className="max-h-[85vh] w-full overflow-y-auto rounded-xl border border-gray-600 bg-[#0f1b2d] text-white shadow-2xl">
            {isLoading || !athlete ? (
              <Modal.Body className="flex flex-col items-center justify-center gap-3 py-14">
                <div
                  className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-white"
                  aria-hidden
                />
                <span className="text-sm text-gray-400">Loading…</span>
              </Modal.Body>
            ) : (
              <>
                <Modal.Header className="flex flex-row items-start justify-between gap-4 border-b border-gray-700/80 pb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-white">{athlete.display_name}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {positionAndJersey(athlete.position, athlete.jersey_num)}
                    </p>
                  </div>
                  <RarityBadge rarity={athlete.rarity} />
                </Modal.Header>

                <Modal.Body className="flex flex-col gap-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <InfoChip label="Age" value={athlete.age?.toString() ?? "N/A"} />
                    <InfoChip
                      label="Height"
                      value={
                        athlete.height
                          ? `${Math.floor(athlete.height / 12)}'${athlete.height % 12}`
                          : "N/A"
                      }
                    />
                    <InfoChip
                      label="Weight"
                      value={athlete.weight ? `${athlete.weight} lbs` : "N/A"}
                    />
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Season statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatCard label="Games played" value={athlete.games_played} />
                      <StatCard label="Touchdowns" value={athlete.touchdowns} />
                      <StatCard label="Pass yards" value={athlete.p_yards} />
                      <StatCard label="Rush yards" value={athlete.r_yards} />
                      <StatCard label="Passes" value={athlete.passes} />
                      <StatCard label="Interceptions" value={athlete.interceptions} />
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="border-t border-gray-700/80 pt-2">
                  <Button className="bg-[#4B90CD] px-8 font-semibold text-white" slot="close">
                    Close
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-gray-700 px-2 py-1 text-xs text-white">
      <span className="text-gray-400">{label}:</span> {value}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-gray-800 p-3 text-center">
      <p className="text-xl font-bold text-white sm:text-2xl">{value ?? "—"}</p>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}
