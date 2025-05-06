// src/components/layout/SidebarContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

// Exporter le contexte pour qu'il soit accessible depuis context-hooks.ts
export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Observer pour détecter l'état de la sidebar au chargement initial
  useEffect(() => {
    // Fonction sécurisée pour vérifier si un élément contient une classe CSS spécifique
    const checkClassPresence = (element: Element | null, classToCheck: string): boolean => {
      if (!element) return true; // Par défaut, considérer comme collapsed

      // Pour les éléments DOM standard
      if (typeof element.className === 'string') {
        return element.className.indexOf(classToCheck) >= 0;
      }

      // Pour les éléments SVG (qui ont SVGAnimatedString)
      // On utilise une vérification plus sûre pour TypeScript
      try {
        // @ts-ignore - Nous savons que c'est potentiellement un SVGAnimatedString
        const baseVal = element.className.baseVal;
        if (typeof baseVal === 'string') {
          return baseVal.indexOf(classToCheck) >= 0;
        }
      } catch (e) {
        console.error("Erreur lors de la vérification de la classe:", e);
      }

      // Par défaut
      return true;
    };

    const checkSidebarState = () => {
      try {
        const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
        if (sidebarElement) {
          const detected = checkClassPresence(sidebarElement, 'w-16');
          setIsCollapsed(detected);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'état de la sidebar:", error);
      }
    };

    // Vérifier l'état initial avec un délai
    const initTimeout = setTimeout(() => {
      checkSidebarState();
    }, 100);

    // Observer pour suivre les changements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkSidebarState();
        }
      });
    });

    // Appliquer l'observer après un délai
    const attachObserver = setTimeout(() => {
      try {
        const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
        if (sidebarElement) {
          observer.observe(sidebarElement, { attributes: true });
        }
      } catch (error) {
        console.error("Erreur lors de l'attachement de l'observer:", error);
      }
    }, 200);

    // Nettoyer
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(attachObserver);
      observer.disconnect();
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};