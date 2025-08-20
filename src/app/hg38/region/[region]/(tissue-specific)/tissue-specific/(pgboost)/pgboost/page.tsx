interface RegionPGBoostPageProps {
  params: {
    region: string;
  };
}

export default async function RegionPGBoostPage({ params }: RegionPGBoostPageProps) {
  const { region } = params;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <h2 className="text-2xl font-semibold text-muted-foreground">PGBoost Data</h2>
      <p className="text-center text-muted-foreground max-w-md">
        PGBoost data is currently only available for individual genes, not genomic regions. 
        Please navigate to specific genes within this region to view PGBoost predictions.
      </p>
    </div>
  );
}