import { TemplateRouter } from "@/components/template";
import { getPage, getPaths } from "@/lib";

export const generateStaticParams = async () => {
  return await getPaths();
};

const InnerPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const template = await getPage((await params).path);
  if (!template) {
    return <></>;
  }

  return <TemplateRouter template={template} />;
};

export default InnerPage;
