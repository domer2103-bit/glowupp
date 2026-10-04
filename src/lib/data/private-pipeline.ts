import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOutwardCode } from "@/lib/postcode";
import { isAtOrPastStatus } from "@/lib/project-status";
import { getSignedPhotoUrl } from "@/lib/storage";
import { PRO_REF_COOKIE } from "@/lib/private-pipeline-cookie";
import { generateReferralCode, generateVanSlug, isValidVanSlug, normalizeReferralCode } from "@/lib/referral";
import { DesignConceptStatus, PipelineLockStatus, ProjectStatus, VerificationStatus, type Prisma } from "@/generated/prisma/client";

/**
 * Private Client Pipeline — a contractor hands a client their link/QR; a
 * project the client starts afterwards is locked to that contractor and
 * can never reach the open marketplace. The lock's source of truth is the
 * PrivatePipelineSession row; Project.isPrivatePipeline is a denormalised
 * convenience flag. Every marketplace entry point must use
 * `notPrivatePipelineWhere` / `assertNotPrivate` rather than trusting the UI.
 */

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Prisma `where` for a currently-active lock. */
export function activeLockWhere(now: Date = new Date()): Prisma.PrivatePipelineSessionWhereInput {
  return { lockStatus: PipelineLockStatus.ACTIVE, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

/** Add to any project query that feeds the open marketplace: excludes projects under an active private lock. */
export function notPrivatePipelineWhere(now: Date = new Date()): Prisma.ProjectWhereInput {
  return { NOT: { privatePipelineSession: { is: activeLockWhere(now) } } };
}

/** The active lock on a project, with the contractor it's locked to — or null if the project is open. */
export async function getActivePipelineForProject(projectId: string) {
  return prisma.privatePipelineSession.findFirst({
    where: { projectId, ...activeLockWhere() },
    include: { professional: { select: { id: true, businessName: true, userId: true } } },
  });
}

/** Server-side guard for the marketplace actions. Returns an error message if the project is private, else null. */
export async function assertNotPrivate(projectId: string): Promise<string | null> {
  const lock = await getActivePipelineForProject(projectId);
  return lock ? `This project is in a private design portal with ${lock.professional.businessName} and can't be shared on the open marketplace.` : null;
}

/** Fills in the contractor's referral code and van slug the first time they're needed. Retries on the (very unlikely) unique collision. */
export async function ensureReferralCodes(professional: { id: string; businessName: string; referralCode: string | null; vanQrSlug: string | null }) {
  let { referralCode, vanQrSlug } = professional;

  for (let attempt = 0; attempt < 6 && (!referralCode || !vanQrSlug); attempt++) {
    try {
      if (!referralCode) {
        const code = generateReferralCode();
        // Only writes while still null, so two concurrent first visits can't overwrite each other's code.
        const { count } = await prisma.professional.updateMany({ where: { id: professional.id, referralCode: null }, data: { referralCode: code } });
        referralCode = count === 1 ? code : (await prisma.professional.findUniqueOrThrow({ where: { id: professional.id } })).referralCode;
      }
      if (!vanQrSlug) {
        const slug = generateVanSlug(professional.businessName);
        const { count } = await prisma.professional.updateMany({ where: { id: professional.id, vanQrSlug: null }, data: { vanQrSlug: slug } });
        vanQrSlug = count === 1 ? slug : (await prisma.professional.findUniqueOrThrow({ where: { id: professional.id } })).vanQrSlug;
      }
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  if (!referralCode || !vanQrSlug) throw new Error("Could not allocate a referral code — please try again.");
  return { referralCode, vanQrSlug };
}

const REFERRER_SELECT = { id: true, businessName: true, verificationStatus: true } as const;

/** A link is only honoured for a professional who exists and hasn't been rejected by admin review. Unknown/invalid codes return null — callers must not reveal which. */
export async function findReferrerByCode(rawCode: string | null | undefined) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  const pro = await prisma.professional.findUnique({ where: { referralCode: code }, select: REFERRER_SELECT });
  return pro && pro.verificationStatus !== VerificationStatus.REJECTED ? pro : null;
}

export async function findReferrerBySlug(slug: string) {
  if (!isValidVanSlug(slug)) return null;
  const pro = await prisma.professional.findUnique({ where: { vanQrSlug: slug }, select: { ...REFERRER_SELECT, referralCode: true } });
  return pro && pro.verificationStatus !== VerificationStatus.REJECTED && pro.referralCode ? pro : null;
}

/**
 * The raw referral code in the visitor's cookie. Kept separate from the
 * lookup because `cookies()` signals "this page is dynamic" by throwing —
 * callers that guard the database lookup must not wrap this call.
 */
export async function getReferralCodeFromCookie() {
  const jar = await cookies();
  return jar.get(PRO_REF_COOKIE)?.value;
}

/** The contractor whose link this visitor last scanned (cookie set by /q/[code]), if still valid. */
export async function getReferrerFromCookie() {
  return findReferrerByCode(await getReferralCodeFromCookie());
}

/**
 * Called whenever the wizard resolves a project for a visitor. If they
 * arrived via a contractor link and the project hasn't been pushed to the
 * market, lock it to that contractor. Idempotent; never touches a project
 * that already has a lock or is already past the market gate (we don't
 * silently pull a live project out of the marketplace).
 */
export async function lockProjectToReferrer(projectId: string, homeownerId: string): Promise<boolean> {
  const referrer = await getReferrerFromCookie();
  if (!referrer) return false;

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { privatePipelineSession: true } });
  if (!project || project.homeownerId !== homeownerId) return false;
  if (project.privatePipelineSession) return project.privatePipelineSession.lockStatus === PipelineLockStatus.ACTIVE;
  if (isAtOrPastStatus(project.status, ProjectStatus.REQUESTING_QUOTES)) return false;

  try {
    await prisma.$transaction([
      prisma.privatePipelineSession.create({ data: { professionalId: referrer.id, homeownerId, projectId } }),
      prisma.project.update({ where: { id: projectId }, data: { isPrivatePipeline: true } }),
      prisma.activityLog.create({ data: { type: "private_pipeline_locked", actorId: homeownerId, projectId, metadata: { professionalId: referrer.id } } }),
    ]);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err; // a concurrent request locked it first — same outcome
  }
  return true;
}

export type PrivateLead = Awaited<ReturnType<typeof listPrivateLeads>>[number];

/**
 * The contractor's "Private Leads & Direct Renders" feed: every active
 * session locked to them, newest first, with the client's completed
 * renders (short-lived signed URLs). Privacy: until the client presses
 * "Send render & request official estimate" the contractor gets renders
 * and an outward postcode only — no name, email or full address.
 */
export async function listPrivateLeads(professionalId: string) {
  const sessions = await prisma.privatePipelineSession.findMany({
    where: { professionalId, ...activeLockWhere() },
    orderBy: { createdAt: "desc" },
    include: {
      homeowner: { select: { name: true, isGuest: true } },
      project: {
        include: {
          designConcepts: { where: { status: DesignConceptStatus.COMPLETE }, orderBy: { version: "desc" }, take: 4 },
          quoteRequests: { where: { professionalId }, take: 1 },
        },
      },
    },
  });

  return Promise.all(
    sessions.map(async (s) => {
      const requested = s.estimateRequestedAt !== null;
      const renders = await Promise.all(
        s.project.designConcepts.map(async (c) => ({
          id: c.id,
          version: c.version,
          styleKey: c.styleKey,
          selected: c.selectedByUser,
          url: c.storagePath ? await getSignedPhotoUrl(c.storagePath) : null,
        }))
      );
      const quoteRequest = s.project.quoteRequests[0] ?? null;
      return {
        sessionId: s.id,
        createdAt: s.createdAt,
        estimateRequestedAt: s.estimateRequestedAt,
        projectId: s.projectId,
        projectType: s.project.projectType,
        projectTitle: s.project.title,
        projectStatus: s.project.status,
        postcode: s.project.postcode ? getOutwardCode(s.project.postcode) : null,
        clientLabel: requested ? (s.homeowner.isGuest ? "Guest client" : s.homeowner.name) : "Client (still designing)",
        renders,
        quoteRequest,
      };
    })
  );
}

export async function countPrivateLeads(professionalId: string): Promise<number> {
  return prisma.privatePipelineSession.count({ where: { professionalId, ...activeLockWhere() } });
}
