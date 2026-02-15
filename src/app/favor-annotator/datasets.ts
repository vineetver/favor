export interface DatasetFile {
  name: string;
  size: string;
  link: string;
}

export interface DatasetGroup {
  kind: string;
  files: DatasetFile[];
}

export const essential: DatasetGroup[] = [
  {
    kind: "CSV",
    files: [
      { name: "Chr1", size: "31.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170506" },
      { name: "Chr2", size: "32.5 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170501" },
      { name: "Chr3", size: "26.6 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170502" },
      { name: "Chr4", size: "25.3 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170521" },
      { name: "Chr5", size: "24.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170511" },
      { name: "Chr6", size: "23.0 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170516" },
      { name: "Chr7", size: "21.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170505" },
      { name: "Chr8", size: "19.4 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170513" },
      { name: "Chr9", size: "16.3 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6165867" },
      { name: "Chr10", size: "18.0 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170507" },
      { name: "Chr11", size: "18.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170517" },
      { name: "Chr12", size: "18.0 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170520" },
      { name: "Chr13", size: "13.1 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170503" },
      { name: "Chr14", size: "12.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170509" },
      { name: "Chr15", size: "11.3 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170515" },
      { name: "Chr16", size: "11.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170518" },
      { name: "Chr17", size: "11.3 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170510" },
      { name: "Chr18", size: "10.5 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170508" },
      { name: "Chr19", size: "8.0 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170514" },
      { name: "Chr20", size: "8.6 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170512" },
      { name: "Chr21", size: "5.1 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170519" },
      { name: "Chr22", size: "5.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170504" },
    ],
  },
  {
    kind: "SQL",
    files: [
      { name: "Chr1", size: "29.1 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157098" },
      { name: "Chr2", size: "30.3 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6170501" },
      { name: "Chr3", size: "24.8 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157113" },
      { name: "Chr4", size: "23.5 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157111" },
      { name: "Chr5", size: "22.5 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157099" },
      { name: "Chr6", size: "22.7 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157108" },
      { name: "Chr7", size: "19.8 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157117" },
      { name: "Chr8", size: "18.1 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157116" },
      { name: "Chr9", size: "15.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157105" },
      { name: "Chr10", size: "16.8 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157115" },
      { name: "Chr11", size: "17.0 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157103" },
      { name: "Chr12", size: "16.8 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157112" },
      { name: "Chr13", size: "12.2 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157109" },
      { name: "Chr14", size: "11.4 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157118" },
      { name: "Chr15", size: "10.5 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157097" },
      { name: "Chr16", size: "10.4 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157106" },
      { name: "Chr17", size: "10.6 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157102" },
      { name: "Chr18", size: "9.7 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157104" },
      { name: "Chr19", size: "7.5 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157107" },
      { name: "Chr20", size: "8.1 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157110" },
      { name: "Chr21", size: "4.8 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157100" },
      { name: "Chr22", size: "4.8 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6157101" },
    ],
  },
];

export const full: DatasetGroup[] = [
  {
    kind: "CSV",
    files: [
      { name: "Chr1", size: "54 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6380374" },
      { name: "Chr2", size: "56 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6380471" },
      { name: "Chr3", size: "46 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6380732" },
      { name: "Chr4", size: "43 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6381512" },
      { name: "Chr5", size: "42 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6381457" },
      { name: "Chr6", size: "40 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6381327" },
      { name: "Chr7", size: "37 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6384125" },
      { name: "Chr8", size: "34 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6382573" },
      { name: "Chr9", size: "28 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6384268" },
      { name: "Chr10", size: "31 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6380273" },
      { name: "Chr11", size: "32 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6384154" },
      { name: "Chr12", size: "31 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6384198" },
      { name: "Chr13", size: "23 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6388366" },
      { name: "Chr14", size: "21 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6388406" },
      { name: "Chr15", size: "20 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6388427" },
      { name: "Chr16", size: "20 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6388551" },
      { name: "Chr17", size: "20 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6388894" },
      { name: "Chr18", size: "18 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6376523" },
      { name: "Chr19", size: "14 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6376522" },
      { name: "Chr20", size: "15 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6376521" },
      { name: "Chr21", size: "8.9 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6358305" },
      { name: "Chr22", size: "9 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6358299" },
    ],
  },
  {
    kind: "SQL",
    files: [
      { name: "Chr1", size: "54 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390348" },
      { name: "Chr2", size: "56 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390367" },
      { name: "Chr3", size: "46 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390380" },
      { name: "Chr4", size: "43 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390381" },
      { name: "Chr5", size: "42 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390579" },
      { name: "Chr6", size: "40 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390604" },
      { name: "Chr7", size: "37 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392022" },
      { name: "Chr8", size: "34 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6391897" },
      { name: "Chr9", size: "28 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392459" },
      { name: "Chr10", size: "31 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392458" },
      { name: "Chr11", size: "32 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392758" },
      { name: "Chr12", size: "31 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392760" },
      { name: "Chr13", size: "23 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392757" },
      { name: "Chr14", size: "21 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6392759" },
      { name: "Chr15", size: "20 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390063" },
      { name: "Chr16", size: "20 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390059" },
      { name: "Chr17", size: "20 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6390009" },
      { name: "Chr18", size: "18 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6389929" },
      { name: "Chr19", size: "14 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6389770" },
      { name: "Chr20", size: "15 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6389011" },
      { name: "Chr21", size: "8.9 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6389006" },
      { name: "Chr22", size: "9.0 GB", link: "https://dataverse.harvard.edu/api/access/datafile/6388961" },
    ],
  },
];
