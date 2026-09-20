-- CreateTable
CREATE TABLE "assistant_messages" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_messages_project_id_idx" ON "assistant_messages"("project_id");

-- AddForeignKey
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: same defense-in-depth posture as every other table (see the Phase 2
-- migration's header comment) — deliberately homeowner + admin only, no
-- professional read access. The raw chat transcript is more casual/
-- unfiltered than the structured requirements a professional is meant to
-- see, so it isn't extended the same read access project_photos/
-- project_requirements give authorized professionals.
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_messages_select_own" ON public.assistant_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = assistant_messages.project_id AND (pr.homeowner_id = auth.uid() OR public.is_admin()))
  );

CREATE POLICY "assistant_messages_write_own" ON public.assistant_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = assistant_messages.project_id AND pr.homeowner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = assistant_messages.project_id AND pr.homeowner_id = auth.uid())
  );
