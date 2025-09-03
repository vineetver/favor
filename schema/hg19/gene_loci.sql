create table if not exists production.gene_loci
(
    gene_name      LowCardinality(String),
    chromosome     LowCardinality(String),
    start_position UInt32,
    end_position   UInt32
)
    engine = MergeTree ORDER BY (gene_name, chromosome, start_position)
        SETTINGS index_granularity = 256;

