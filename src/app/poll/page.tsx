import { redirect } from "next/navigation";

// The pricing survey is over: a paid Pro plan now exists, so anyone arriving from an old
// post is sent to the real plans. Votes already collected stay in the admin results
// (/admin/poll); the vote form and its server action are left in place, unused.
export default function PricingPollPage() {
  redirect("/pricing");
}
