import { motion } from 'framer-motion';
import { Dna, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/lib/design-system/chat-variants';
import { chatAnimations } from '@/lib/design-system/chat-theme';

const exampleMessages = [
  {
    heading: "Define a database annotation field",
    message: "What does the CADD Phred score represent?",
  },
  {
    heading: "Assess variant impact by in silico score",
    message: "Is a SIFT score of 0.02 considered damaging?",
  },
  {
    heading: "Get a concise gene summary",
    message: "Summarize the key function and location of the APOE gene.",
  },
  {
    heading: "Retrieve clinical and population data for a variant",
    message: "What is the clinical significance and allele frequency of 19-44908822-C-T (rs7412)?",
  },
  {
    heading: "Query functional consequences in a region",
    message: "List variant's functional consequence (e.g. missense, synonymous) for 1-150000000-150000100.",
  },
  {
    heading: "Compare multiple variants at a glance",
    message: "Compare rs7412 and rs429358 across allele frequency, clinical significance, and in-silico scores.",
  }
];

interface GreetingProps {
  setInput: (input: string) => void;
}

export const Greeting = ({ setInput }: GreetingProps) => {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={chatAnimations.transition.normal}
        className="text-center mb-6"
      >
        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg inline-block mb-3">
          <Dna className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Welcome to FAVOR-GPT
        </h1>
        <p className="text-sm text-muted-foreground">
          Your AI assistant for genomics and variant analysis
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3 }}
        className={cardVariants({ variant: 'elevated', padding: 'sm' })}
      >
        <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Try these examples
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {exampleMessages.map((example, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="justify-start h-auto p-2 text-left text-xs hover:bg-accent/50"
              onClick={() => setInput(example.message)}
            >
              <ChevronRight className="w-3 h-3 mr-2 flex-shrink-0" />
              <span className="truncate">{example.heading}</span>
            </Button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};