import AstroTracker from "@/components/AstroTracker";
import { LanguageProvider } from "@/hooks/use-language";

const Index = () => {
  return (
    <LanguageProvider>
      <AstroTracker />
    </LanguageProvider>
  );
};

export default Index;
