import ExperiencesBackground from "@/app/component/app-experiences/ExperiencesBackground";
import ExperiencesHeader from "@/app/component/app-experiences/ExperiencesHeader";
import ExperiencesTitle from "@/app/component/app-experiences/ExperiencesTitle";
import ExperiencesTiles from "@/app/component/app-experiences/ExperiencesTiles";
import ExperiencesFooter from "@/app/component/app-experiences/ExperiencesFooter";
import { colors } from "@/config/theme";

export default function ExperiencesPage() {
  return (
    <div
      className="h-screen text-white relative overflow-hidden flex flex-col"
      style={{ backgroundColor: colors.background }}
    >
      <ExperiencesBackground />
      <ExperiencesHeader />

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 min-h-0 px-8 py-4">
        <ExperiencesTitle />
        <ExperiencesTiles />
      </main>

      <ExperiencesFooter />
    </div>
  );
}
