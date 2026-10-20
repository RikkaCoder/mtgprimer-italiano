import { TemplateRouter } from "@/components/template";
import { getPage } from "@/lib";

const NotFound = async () => {
  const template = await getPage(["not-found"]);

  if (!template) {
    return <></>;
  }

  return <TemplateRouter template={template} />;
};

export default NotFound;
