import "server-only";
import { prisma } from "@/lib/prisma";
import { requireProjectOwner } from "@/lib/data/projects";
import { matchProfessionals, type MatchResult } from "@/lib/matching";

/** Homeowner-owner only, same as every other per-project read — a professional shouldn't be able to see who else was matched against someone's project. */
export async function getMatchingProfessionals(projectId: string): Promise<MatchResult[]> {
  const project = await requireProjectOwner(projectId);

  const professionals = await prisma.professional.findMany({
    include: { services: true },
  });

  return matchProfessionals(
    {
      projectType: project.projectType,
      postcode: project.postcode,
      budgetMin: project.budgetMin,
      budgetMax: project.budgetMax,
      targetStartDate: project.targetStartDate,
    },
    professionals
  );
}
