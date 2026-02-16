import { fetchGene } from "@features/gene/api";
import { NoDataState } from "@shared/components/ui/error-states";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { notFound } from "next/navigation";

interface TepPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TepPage({ params }: TepPageProps) {
  const { id } = await params;
  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const tep = gene.opentargets?.tep;

  if (!tep) {
    return (
      <NoDataState
        categoryName="Target Enabling Package"
        description="No Target Enabling Package (TEP) is available for this gene."
      />
    );
  }

  return (
    <Card className="border border-border py-0 gap-0">
      <CardHeader className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Target Enabling Package (TEP)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Open-access reagents and data for target validation from the
              Structural Genomics Consortium
            </p>
          </div>
          {tep.url && (
            <ExternalLink
              href={tep.url}
              className="text-sm text-muted-foreground hover:text-primary"
              iconSize="sm"
            >
              View Full TEP
            </ExternalLink>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 py-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {tep.targetFromSourceId && (
            <div>
              <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Target ID
              </dt>
              <dd className="text-sm font-mono text-foreground">
                {tep.targetFromSourceId}
              </dd>
            </div>
          )}
          {tep.therapeuticArea && (
            <div>
              <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Therapeutic Area
              </dt>
              <dd className="text-sm text-foreground">
                {tep.therapeuticArea}
              </dd>
            </div>
          )}
          {tep.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Description
              </dt>
              <dd className="text-sm text-foreground leading-relaxed">
                {tep.description}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
