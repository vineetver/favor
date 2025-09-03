create table if not exists production.user_join_keys_mem
(
    variant_vcf String
)
    engine = Join(ANY, INNER, variant_vcf)
    SETTINGS join_use_nulls = 0, max_rows_in_join = 100000000, join_algorithm = 'hash';

-- Alternative bulk lookup table for very large datasets (20M+ variants)
create table if not exists production.user_variants_bulk
(
    variant_vcf String,
    user_id String DEFAULT '',
    batch_id String DEFAULT ''
)
    engine = MergeTree 
    ORDER BY variant_vcf
    PARTITION BY user_id
    SETTINGS index_granularity = 1024;

-- Memory-optimized temporary table for batch processing
create table if not exists production.user_variants_temp
(
    variant_vcf String
)
    engine = Memory;
