import { motion } from 'framer-motion';
import { Dna, FileText, Network, BarChart3 } from 'lucide-react';
import { cardVariants } from '@/lib/design-system/chat-variants';
import { chatAnimations } from '@/lib/design-system/chat-theme';

export const Greeting = () => {
  return (
    <div className="max-w-3xl mx-auto md:mt-12 px-6 size-full flex flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={chatAnimations.transition.normal}
        className="flex items-center gap-4 mb-6"
      >
        <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm">
          <Dna className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome to FAVOR-GPT
          </h1>
          <p className="text-muted-foreground">
            Your AI assistant for genomics and variant analysis
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      >
        <div className={cardVariants({ variant: 'interactive', padding: 'md' })}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Variant Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Query variant effects, population frequencies, and functional annotations
              </p>
            </div>
          </div>
        </div>

        <div className={cardVariants({ variant: 'interactive', padding: 'md' })}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Dna className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Gene Information</h3>
              <p className="text-xs text-muted-foreground">
                Explore gene functions, expression patterns, and disease associations
              </p>
            </div>
          </div>
        </div>

        <div className={cardVariants({ variant: 'interactive', padding: 'md' })}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Network className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Pathway Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Investigate biological pathways and protein-protein interactions
              </p>
            </div>
          </div>
        </div>

        <div className={cardVariants({ variant: 'interactive', padding: 'md' })}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Data Visualization</h3>
              <p className="text-xs text-muted-foreground">
                Generate charts and visualizations from genomics data
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.7 }}
        className={cardVariants({ variant: 'elevated', padding: 'md' })}
      >
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Quick Examples
        </h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• "Tell me about the functional impact of rs1234567"</p>
          <p>• "What pathways is the BRCA1 gene involved in?"</p>
          <p>• "Show me expression data for TP53 across tissues"</p>
          <p>• "Analyze variants in the region chr17:41100000-41300000"</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.9 }}
        className="text-center mt-6"
      >
        <p className="text-sm text-muted-foreground">
          Ask me anything about genomics, variants, or upload your VCF files for analysis
        </p>
      </motion.div>
    </div>
  );
};