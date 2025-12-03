import { basicConfig } from "./columns/basic";
import { functionalClassConfig } from "./columns/functional-class";
import { clinvarConfig } from "./columns/clinvar";
import { overallAfConfig } from "./columns/overall-af";
import { ancestryAfConfig } from "./columns/ancestry-af";
import { genderAfFemaleConfig, genderAfMaleConfig } from "./columns/gender-af";
import { integrativeConfig } from "./columns/integrative";
import { proteinFunctionConfig } from "./columns/protein-function";
import { conservationConfig } from "./columns/conservation";
import { epigeneticsConfig } from "./columns/epigenetics";
import { transcriptionFactorConfig } from "./columns/transcription-factor";
import { chromatinStateConfig } from "./columns/chromatin-state";

export const variantDetailedColumns = [
  basicConfig,
  functionalClassConfig,
  clinvarConfig,
  overallAfConfig,
  ancestryAfConfig,
  genderAfMaleConfig,
  genderAfFemaleConfig,
  integrativeConfig,
  proteinFunctionConfig,
  conservationConfig,
  epigeneticsConfig,
  transcriptionFactorConfig,
  chromatinStateConfig,
];
