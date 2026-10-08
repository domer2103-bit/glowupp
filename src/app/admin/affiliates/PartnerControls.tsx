import { markAffiliatePaid, setAffiliateStatus } from "@/lib/actions/affiliates";
import { formatPenceExact } from "@/lib/money";
import { AffiliateStatus } from "@/generated/prisma/client";

/** Suspend/reactivate and "mark balance as paid" for one partner — shared by the overview table and the partner page. */
export function PartnerControls(props: { partnerId: string; status: AffiliateStatus; balancePence: number }) {
  const active = props.status === AffiliateStatus.ACTIVE;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={setAffiliateStatus.bind(null, props.partnerId, active ? AffiliateStatus.SUSPENDED : AffiliateStatus.ACTIVE)}>
        <button type="submit" className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-[#132a4d] hover:border-[#3a6694]">
          {active ? "Suspend" : "Reactivate"}
        </button>
      </form>
      {props.balancePence > 0 ? (
        <form action={markAffiliatePaid.bind(null, props.partnerId, props.balancePence)} className="flex flex-wrap items-center gap-2">
          <input name="note" maxLength={200} placeholder="Note (e.g. bank ref)" aria-label="Payout note" className="w-36 rounded-lg border border-zinc-300 px-2 py-1 text-xs" />
          <button type="submit" className="rounded-full bg-[#3a6694] px-3 py-1 text-xs font-medium text-white hover:bg-[#2c5075]">
            Mark {formatPenceExact(props.balancePence)} paid
          </button>
        </form>
      ) : props.balancePence < 0 ? (
        <span className="text-xs text-red-600">Owes GlowUpp {formatPenceExact(-props.balancePence)} (fee reversed after payout)</span>
      ) : null}
    </div>
  );
}
