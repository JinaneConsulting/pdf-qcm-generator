// src/components/layout/SidebarHeader.tsx
import React, { useEffect, useState } from 'react';
import quizzaiLogo from '../../assets/quizzai-logo.svg';

const SidebarHeader: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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

  // Observer pour détecter l'état réel de la sidebar
  useEffect(() => {
    const checkSidebarState = () => {
      try {
        const sidebarElement = document.querySelector('[class*="w-16"], [class*="w-72"]');
        if (sidebarElement) {
          setIsSidebarCollapsed(checkClassPresence(sidebarElement, 'w-16'));
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'état de la sidebar:", error);
      }
    };

    // Vérifier l'état initial avec un délai pour assurer le chargement du DOM
    const initTimeout = setTimeout(() => {
      checkSidebarState();
    }, 100);

    // Créer un observateur pour suivre les changements
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

    return () => {
      clearTimeout(initTimeout);
      clearTimeout(attachObserver);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="p-4 flex items-center gap-3">
      {/* Logo - toujours visible */}
      <div className="h-8 w-8 flex items-center justify-center text-blue-600">
        <img
          src={quizzaiLogo}
          alt="QuizzAi Logo"
          className="h-full w-full object-contain text-blue-600 fill-blue-600 filter-none"
          style={{ filter: 'invert(0)', color: '#2563eb' }}
        />
      </div>

      {/* Texte - visible uniquement quand la sidebar est dépliée */}
      {!isSidebarCollapsed && (
        <div>
          <span className="text-xl font-semibold text-blue-600">QuizzAi</span>
        </div>
      )}
    </div>
  );
};

export default SidebarHeader;