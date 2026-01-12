"use client";

import { useEffect, useState } from "react";
import { animate, stagger } from "animejs";

interface Section {
  id: string;
  label: string;
}

export function useScrollTracking(sections: Section[]) {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Track active section
      sections.forEach((section, index) => {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollY >= offsetTop - windowHeight / 2 &&
            scrollY < offsetTop + offsetHeight - windowHeight / 2
          ) {
            setActiveSection(index);
          }
        }
      });

      // Animate diagram elements when in view
      const diagramSection = document.getElementById("what-is-thingsx");
      if (diagramSection) {
        const { offsetTop, offsetHeight } = diagramSection;
        const sectionStart = offsetTop - windowHeight * 0.5;
        const sectionEnd = offsetTop + offsetHeight * 0.3;
        const isInView = scrollY >= sectionStart && scrollY <= sectionEnd;

        if (isInView) {
          const progress = Math.max(
            0,
            Math.min(1, (scrollY - sectionStart) / (sectionEnd - sectionStart))
          );

          // Animate arc path drawing
          const arc = document.querySelector(".diagram-arc") as SVGPathElement;
          if (arc && !arc.dataset.animated) {
            const pathLength = arc.getTotalLength();
            arc.style.strokeDasharray = `${pathLength}`;
            arc.style.strokeDashoffset = `${pathLength}`;
            arc.dataset.animated = "true";

            animate(".diagram-arc", {
              strokeDashoffset: [pathLength, 0],
              opacity: [0, 0.6],
              duration: 1500,
              easing: "easeOutCubic",
            });
          }

          // Animate elements sequentially when section is in view
          if (progress > 0.2 && !document.querySelector(".diagram-console")?.classList.contains("animated")) {
            document.querySelectorAll(".diagram-console").forEach((el) => {
              el.classList.add("animated");
            });
            animate(".diagram-console", {
              opacity: [0, 1],
              scale: [0.8, 1],
              duration: 600,
              easing: "easeOutBack",
            });
          }

          if (progress > 0.4 && !document.querySelector(".diagram-gateway")?.classList.contains("animated")) {
            document.querySelectorAll(".diagram-gateway").forEach((el) => {
              el.classList.add("animated");
            });
            animate(".diagram-gateway", {
              opacity: [0, 1],
              scale: [0.8, 1],
              duration: 500,
              delay: stagger(100),
              easing: "easeOutBack",
            });
          }

          if (progress > 0.6 && !document.querySelector(".diagram-sensor")?.classList.contains("animated")) {
            document.querySelectorAll(".diagram-sensor").forEach((el) => {
              el.classList.add("animated");
            });
            animate(".diagram-sensor", {
              opacity: [0, 1],
              scale: [0.7, 1],
              duration: 400,
              delay: stagger(80),
              easing: "easeOutBack",
            });
          }

          if (progress > 0.8 && !document.querySelector(".diagram-peripheral")?.classList.contains("animated")) {
            document.querySelectorAll(".diagram-peripheral").forEach((el) => {
              el.classList.add("animated");
            });
            animate(".diagram-peripheral", {
              opacity: [0, 1],
              scale: [0.7, 1],
              duration: 400,
              delay: stagger(60),
              easing: "easeOutBack",
            });
          }

          // Animate component definition labels
          if (progress > 0.9 && !document.querySelector(".diagram-label")?.classList.contains("animated")) {
            document.querySelectorAll(".diagram-label").forEach((el) => {
              el.classList.add("animated");
            });
            animate(".diagram-label", {
              opacity: [0, 1],
              translateX: [20, 0],
              duration: 500,
              delay: stagger(100),
              easing: "easeOutCubic",
            });
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (index: number) => {
    const element = document.getElementById(sections[index].id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return {
    activeSection,
    scrollToSection,
  };
}
