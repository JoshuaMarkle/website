import { notFound } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import ScrollButton from "@/components/layout/ScrollButton";
import UvaChatbot from "@/components/projects/UvaChatbot";
import AlgoType from "@/components/projects/AlgoType";

const projectComponents = {
  "uva-chatbot": UvaChatbot,
  algotype: AlgoType,
};

export default function ProjectPage({ params }) {
  const { project } = params;
  const ProjectComponent = projectComponents[project];

  if (!ProjectComponent) {
    notFound();
  }

  return (
    <main className="w-full max-w-4xl mx-auto p-4 lg:py-8 xl:py-16 transition-all duration-100 overflow-auto">
      <PageHeader />
      <ProjectComponent />
      <ScrollButton />
    </main>
  );
}
