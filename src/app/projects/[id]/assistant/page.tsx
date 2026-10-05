import { redirect } from "next/navigation";

/** The assistant now lives in a pop-up on the project page; this keeps old links and bookmarks working by opening it there. */
export default async function AssistantPage(props: PageProps<"/projects/[id]/assistant">) {
  const { id } = await props.params;
  redirect(`/projects/${id}?chat=1`);
}
