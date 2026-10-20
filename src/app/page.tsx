import { TemplateRouter } from "@/components/template";
import { getPage } from "@/lib";

const Home = async () => {
  const template = await getPage([]);

  if (!template) {
    return <></>;
  }

  return <TemplateRouter template={template} />;
};

export default Home;
