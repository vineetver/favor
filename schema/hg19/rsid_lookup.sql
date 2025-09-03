create table if not exists production.rsid_lookup
(
    rsid        String,
    variant_vcf String,
    chromosome  LowCardinality(String),
    position    UInt32
)
    engine = MergeTree ORDER BY rsid
        SETTINGS index_granularity = 8192;

