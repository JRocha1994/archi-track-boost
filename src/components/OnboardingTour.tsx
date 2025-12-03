import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

const steps = [
  {
    title: "Bem-vindo à Gestão de Projetos",
    description: "Vamos fazer um tour rápido para você aproveitar ao máximo a plataforma.",
  },
  {
    title: "1. Cadastros Básicos",
    description: "Comece pela aba 'Empreendimentos'. Cadastre seus empreendimentos, depois suas 'Obras', 'Disciplinas' e 'Projetistas'.",
  },
  {
    title: "2. Controle de Revisões",
    description: "Com os dados cadastrados, você pode incluir suas revisões. Você pode adicionar manualmente, importar via Excel (XLSX) ou copiar de uma revisão anterior para agilizar.",
  },
  {
    title: "3. Acompanhamento",
    description: "Na aba 'Indicadores', acompanhe o dashboard com gráficos e dados de performance dos seus projetos em tempo real.",
  }
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeen) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleFinish(); // Se fechar clicando fora, marca como visto
        setOpen(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{steps[currentStep].title}</DialogTitle>
          <DialogDescription className="text-base mt-2 pt-2">
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-6">
            <div className="flex gap-2">
                {steps.map((_, index) => (
                    <div 
                        key={index} 
                        className={`h-2 w-2 rounded-full transition-colors ${index === currentStep ? 'bg-primary' : 'bg-gray-200'}`}
                    />
                ))}
            </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button 
            variant="ghost" 
            onClick={handlePrev} 
            disabled={currentStep === 0}
            className={currentStep === 0 ? "invisible" : ""}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
                <>Concluir <Check className="ml-2 h-4 w-4" /></>
            ) : (
                <>Próximo <ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
