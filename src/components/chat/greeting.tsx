import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatAnimations } from "@/lib/design-system/chat-theme";

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
    message:
      "What is the clinical significance and allele frequency of 19-44908822-C-T (rs7412)?",
  },
  {
    heading: "Query functional consequences in a region",
    message:
      "List variant's functional consequence (e.g. missense, synonymous) for 1-150000000-150000100.",
  },
  {
    heading: "Compare multiple variants at a glance",
    message:
      "Compare rs7412 and rs429358 across allele frequency, clinical significance, and in-silico scores.",
  },
];

interface GreetingProps {
  setInput?: (input: string) => void;
}

export const Greeting = ({ setInput }: GreetingProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={chatAnimations.transition.normal}
        className="text-center mb-6"
      >
        <motion.h1
          className="text-2xl font-semibold text-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Welcome to{" "}
          <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            FAVOR-GPT
          </span>
        </motion.h1>

        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Your AI assistant for genomics and variant analysis
        </motion.p>

      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3 }}
        className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {exampleMessages.map((example, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.03 }}
            >
              <Button
                variant="ghost"
                className="w-full h-auto p-3 text-left group hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-xl transition-all duration-200"
                onClick={() => setInput?.(example.message)}
              >
                <div className="flex items-start gap-2 w-full">
                  <ChevronRight className="w-3 h-3 text-primary mt-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground mb-1">
                      {example.heading}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {example.message}
                    </p>
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
        
      </motion.div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
          ⚠️ Research Use Only: FAVOR-GPT outputs are for research and educational purposes and are not intended for clinical or diagnostic use.
        </p>
    </div>
  );
};
