import { ccreColorMapping } from "@/components/tracks/ccre";
import type { OverlaidTracks } from "@/components/gosling";

export const eQTLTrack2: OverlaidTracks[] = [
  {
    alignment: "overlay",
    title: "eQTLs Links",
    data: {
      url: "https://higlass.genohub.org/api/v1/tileset_info/?d=ccre-updated-hg38",
      type: "beddb",
      genomicFields: [
        { index: 1, name: "start" },
        { index: 2, name: "end" },
      ],
      valueFields: [
        { index: 0, name: "chromosome", type: "nominal" },
        { index: 1, name: "start_position", type: "nominal" },
        { index: 2, name: "end_position", type: "nominal" },
        { index: 3, name: "elementId", type: "nominal" },
        { index: 4, name: "accession", type: "nominal" },
        { index: 5, name: "ccre", type: "nominal" },
        { index: 6, name: "ccre_full", type: "nominal" },
      ],
    },
    dataTransform: [
      {
        type: "displace",
        boundingBox: {
          startField: "start",
          endField: "end",
          padding: 5,
        },
        method: "spread",
        newField: "a",
      },
    ],
    tracks: [
      {
        mark: "point",
        size: {
          value: 6,
        },
        color: {
          legend: true,
          field: "ccre_full",
          type: "nominal",
          domain: [
            "Promoter",
            "Proximal enhancer",
            "Distal enhancer",
            "Chromatin Accessible with CTCF",
            "Chromatin Accessible with H3K4me3",
            "Chromatin Accessible with TF",
            "Chromatin Accessible Only",
            "TF Only",
          ],
          range: [
            ccreColorMapping["PLS"],
            ccreColorMapping["pELS"],
            ccreColorMapping["dELS"],
            ccreColorMapping["CA-CTCF"],
            ccreColorMapping["CA-H3K4me3"],
            ccreColorMapping["CA-TF"],
            ccreColorMapping["CA"],
            ccreColorMapping["TF"],
          ],
        },
      },
    ],
    x: { field: "start", type: "genomic", linkingId: "link1" },
    opacity: { value: 0.8 },
    style: { inlineLegend: true },
    tooltip: [
      { field: "ccre_full", type: "nominal", alt: "cCRE Type" },
      { field: "accession", type: "nominal", alt: "Accession" },
    ],
    width: 700,
    height: 60,
  },
  {
    alignment: "overlay",
    data: {
      url: "https://higlass.genohub.org/api/v1/tileset_info/?d=eqtls-hg38",
      type: "beddb",
      genomicFields: [
        { index: 1, name: "start" },
        { index: 2, name: "end" },
        { index: 13, name: "start2" },
        { index: 14, name: "end2" },
      ],
      valueFields: [
        { index: 0, name: "chromosome", type: "nominal" },
        { index: 3, name: "accession", type: "nominal" },
        { index: 4, name: "ensembleID", type: "nominal" },
        { index: 5, name: "gene_name", type: "nominal" },
        { index: 6, name: "gene_type", type: "nominal" },
        { index: 7, name: "hic_experiment", type: "nominal" },
        { index: 8, name: "hic_experiment_id", type: "nominal" },
        { index: 9, name: "tissue", type: "nominal" },
        { index: 11, name: "p_value", type: "quantitative" },
        { index: 12, name: "chromosome2", type: "nominal" },
        { index: 15, name: "sig", type: "nominal" },
      ],
    },
    dataTransform: [
      { type: "filter", field: "sig", oneOf: ["significant"] },
      {
        type: "displace",
        boundingBox: {
          startField: "start",
          endField: "end",
          padding: 5,
        },
        method: "spread",
        newField: "a",
      },
    ],
    tracks: [
      {
        mark: "betweenLink",
        color: { value: "#029F73" },
        stroke: { value: "lightgrey" },
        strokeWidth: { value: 1 },
        opacity: { value: 1 },
      },
    ],
    xe: { field: "start", type: "genomic" },
    x: { field: "start2", type: "genomic", linkingId: "link1" },
    width: 700,
    height: 150,
  },
  {
    alignment: "overlay",
    tracks: [
      {
        data: {
          url: "https://higlass.genohub.org/api/v1/tileset_info/?d=eqtls-hg38",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
            { index: 13, name: "start2" },
            { index: 14, name: "end2" },
          ],
          valueFields: [
            { index: 0, name: "chromosome", type: "nominal" },
            { index: 3, name: "accession", type: "nominal" },
            { index: 4, name: "ensembleID", type: "nominal" },
            { index: 5, name: "gene_name", type: "nominal" },
            { index: 6, name: "gene_type", type: "nominal" },
            { index: 7, name: "hic_experiment", type: "nominal" },
            { index: 8, name: "hic_experiment_id", type: "nominal" },
            { index: 9, name: "tissue", type: "nominal" },
            { index: 11, name: "p_value", type: "quantitative" },
            { index: 12, name: "chromosome2", type: "nominal" },
            { index: 15, name: "sig", type: "nominal" },
          ],
        },
        dataTransform: [
          { type: "filter", field: "sig", oneOf: ["significant"] },
        ],
        mark: "rect",
        color: { value: "lightgray" },
        stroke: { value: "lightgray" },
        strokeWidth: { value: 0.1 },
        x: { field: "start", type: "genomic", linkingId: "link1" },
        xe: { field: "end", type: "genomic" },
        opacity: { value: 0.8 },
      },
      {
        data: {
          url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
          ],
          valueFields: [
            { index: 5, name: "strand", type: "nominal" },
            { index: 3, name: "name", type: "nominal" },
          ],
          exonIntervalFields: [
            { index: 12, name: "start" },
            { index: 13, name: "end" },
          ],
        },
        row: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
        },
        color: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
          range: ["#7585FF", "#FF8A85"],
        },
        visibility: [
          {
            operation: "less-than",
            measure: "width",
            threshold: "|xe-x|",
            transitionPadding: 10,
            target: "mark",
          },
        ],
        opacity: { value: 0.8 },
        dataTransform: [
          { type: "filter", field: "type", oneOf: ["gene"] },
          { type: "filter", field: "strand", oneOf: ["+"] },
        ],
        mark: "triangleRight",
        x: { field: "end", type: "genomic", axis: "none", linkingId: "link1" },
        size: { value: 15 },
      },
      {
        data: {
          url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
          ],
          valueFields: [
            { index: 5, name: "strand", type: "nominal" },
            { index: 3, name: "name", type: "nominal" },
          ],
          exonIntervalFields: [
            { index: 12, name: "start" },
            { index: 13, name: "end" },
          ],
        },
        row: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
        },
        color: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
          range: ["#7585FF", "#FF8A85"],
        },
        visibility: [
          {
            operation: "less-than",
            measure: "width",
            threshold: "|xe-x|",
            transitionPadding: 10,
            target: "mark",
          },
        ],
        opacity: { value: 0.8 },
        dataTransform: [{ type: "filter", field: "type", oneOf: ["gene"] }],
        mark: "text",
        text: { field: "name", type: "nominal" },
        x: { field: "start", type: "genomic", linkingId: "link1" },
        xe: { field: "end", type: "genomic" },
        style: { dy: -15 },
      },
      {
        data: {
          url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
          ],
          valueFields: [
            { index: 5, name: "strand", type: "nominal" },
            { index: 3, name: "name", type: "nominal" },
          ],
          exonIntervalFields: [
            { index: 12, name: "start" },
            { index: 13, name: "end" },
          ],
        },
        row: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
        },
        color: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
          range: ["#7585FF", "#FF8A85"],
        },
        visibility: [
          {
            operation: "less-than",
            measure: "width",
            threshold: "|xe-x|",
            transitionPadding: 10,
            target: "mark",
          },
        ],
        opacity: { value: 0.8 },
        dataTransform: [
          { type: "filter", field: "type", oneOf: ["gene"] },
          { type: "filter", field: "strand", oneOf: ["-"] },
        ],
        mark: "triangleLeft",
        x: { field: "start", type: "genomic", linkingId: "link1" },
        size: { value: 15 },
        style: { align: "right" },
      },
      {
        data: {
          url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
          ],
          valueFields: [
            { index: 5, name: "strand", type: "nominal" },
            { index: 3, name: "name", type: "nominal" },
          ],
          exonIntervalFields: [
            { index: 12, name: "start" },
            { index: 13, name: "end" },
          ],
        },
        row: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
        },
        color: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
          range: ["#7585FF", "#FF8A85"],
        },
        visibility: [
          {
            operation: "less-than",
            measure: "width",
            threshold: "|xe-x|",
            transitionPadding: 10,
            target: "mark",
          },
        ],
        opacity: { value: 0.8 },
        dataTransform: [{ type: "filter", field: "type", oneOf: ["exon"] }],
        mark: "rect",
        x: { field: "start", type: "genomic", linkingId: "link1" },
        size: { value: 15 },
        xe: { field: "end", type: "genomic" },
      },
      {
        data: {
          url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
          ],
          valueFields: [
            { index: 5, name: "strand", type: "nominal" },
            { index: 3, name: "name", type: "nominal" },
          ],
          exonIntervalFields: [
            { index: 12, name: "start" },
            { index: 13, name: "end" },
          ],
        },
        row: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
        },
        color: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
          range: ["#7585FF", "#FF8A85"],
        },
        visibility: [
          {
            operation: "less-than",
            measure: "width",
            threshold: "|xe-x|",
            transitionPadding: 10,
            target: "mark",
          },
        ],
        opacity: { value: 0.8 },
        dataTransform: [
          { type: "filter", field: "type", oneOf: ["gene"] },
          { type: "filter", field: "strand", oneOf: ["+"] },
        ],
        mark: "rule",
        x: { field: "start", type: "genomic", linkingId: "link1" },
        strokeWidth: { value: 3 },
        xe: { field: "end", type: "genomic" },
        style: { linePattern: { type: "triangleRight", size: 5 } },
      },
      {
        data: {
          url: "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation",
          type: "beddb",
          genomicFields: [
            { index: 1, name: "start" },
            { index: 2, name: "end" },
          ],
          valueFields: [
            { index: 5, name: "strand", type: "nominal" },
            { index: 3, name: "name", type: "nominal" },
          ],
          exonIntervalFields: [
            { index: 12, name: "start" },
            { index: 13, name: "end" },
          ],
        },
        row: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
        },
        color: {
          field: "strand",
          type: "nominal",
          domain: ["+", "-"],
          range: ["#7585FF", "#FF8A85"],
        },
        visibility: [
          {
            operation: "less-than",
            measure: "width",
            threshold: "|xe-x|",
            transitionPadding: 10,
            target: "mark",
          },
        ],
        opacity: { value: 0.8 },
        dataTransform: [
          { type: "filter", field: "type", oneOf: ["gene"] },
          { type: "filter", field: "strand", oneOf: ["-"] },
        ],
        mark: "rule",
        x: { field: "start", type: "genomic", linkingId: "link1" },
        strokeWidth: { value: 3 },
        xe: { field: "end", type: "genomic" },
        style: { linePattern: { type: "triangleLeft", size: 5 } },
      },
    ],
    width: 700,
    height: 100,
  },
];
