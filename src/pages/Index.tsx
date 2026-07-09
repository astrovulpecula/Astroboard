import AstroTracker from "@/components/AstroTracker";
import { LanguageProvider } from "@/hooks/use-language";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <LanguageProvider>
      <AstroTracker />
      <Footer />
    </LanguageProvider>
  );
};

export default Index;
