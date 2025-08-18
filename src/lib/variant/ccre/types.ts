export interface CCRE {
  chromosome: string;
  start_position: number;
  end_position: number;
  element_id1: string;
  accession: string;
  annotations: string;
}

export interface CCRETissue {
  chromosome: string;
  start_position: number;
  end_position: number;
  accession: string;
  score: number;
  datatype: string;
  dnase: number;
  atac: number;
  ctcf: number;
  h3k27ac: number;
  h3k4me3: number;
}
