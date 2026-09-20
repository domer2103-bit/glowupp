import Link from "next/link";
import { getMatchingProfessionals } from "@/lib/data/matching";
import { requireProjectOwner } from "@/lib/data/projects";
import { validateProjectReadyForQuotes } from "@/lib/actions/quotes";
import { prisma } from "@/lib/prisma";
import { RequestQuotesForm } from "./RequestQuotesForm";

export default async function MatchingProfessionalsPage(props: PageProps<"/projects/[id]/professionals">) {
  const { id } = await props.params;
  const project = await requireProjectOwner(id);
  const matches = await getMatchingProfessionals(id);
  const readinessError = await validateProjectReadyForQuotes(project);

  const existingRequests = await prisma.quoteRequest.findMany({ where: { projectId: id }, select: { professionalId: true } });
  const alreadyRequested = new Set(existingRequests.map((r) => r.professionalId));
  const requestable = matches.filter((m) => !alreadyRequested.has(m.professional.id));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ← {project.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Local pros for this project</h1>
        <p className="text-sm text-zinc-500">
          Every pro below passed the same transparent checks — offers this project type, serves this postcode area, isn&apos;t
          rejected, and is currently available. You choose who to hear from; nobody&apos;s bidding for your attention.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No professionals currently match this project.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.professional.id} className="rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.professional.businessName}</span>
                <span className="text-xs text-zinc-500">
                  {m.professional.verificationStatus}
                  {alreadyRequested.has(m.professional.id) && " — quote already requested"}
                </span>
              </div>
              <p className="text-sm text-zinc-500">{m.professional.postcode}</p>
              <ul className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-500">
                {m.rules.map((r) => (
                  <li key={r.rule}>✓ {r.detail}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {readinessError ? (
        <p className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {readinessError}
        </p>
      ) : requestable.length > 0 ? (
        <RequestQuotesForm projectId={id} professionals={requestable.map((m) => ({ id: m.professional.id, businessName: m.professional.businessName }))} />
      ) : matches.length > 0 ? (
        <p className="text-sm text-zinc-500">Quotes have already been requested from every matching professional.</p>
      ) : null}

      <Link href={`/projects/${id}/quotes`} className="text-sm underline">
        View requested quotes →
      </Link>
    </div>
  );
}
