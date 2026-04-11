"use client";

import { Badge } from "@shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shared/components/ui/tabs";
import { Download } from "lucide-react";
import { type DatasetGroup, essential, full } from "./datasets";

function DatasetTable({ dataset }: { dataset: DatasetGroup[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Filename</TableHead>
          <TableHead>Filesize</TableHead>
          <TableHead className="text-right">Harvard Dataverse</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataset.map((group) =>
          group.files.map((file, index) => (
            <TableRow key={`${group.kind}-${file.name}-${index}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {file.name}
                  </span>
                  <Badge
                    variant={group.kind === "SQL" ? "default" : "secondary"}
                  >
                    {group.kind}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {file.size}
              </TableCell>
              <TableCell className="text-right">
                <a
                  href={file.link}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </TableCell>
            </TableRow>
          )),
        )}
      </TableBody>
    </Table>
  );
}

export function DatasetTabs() {
  return (
    <Tabs defaultValue="essential">
      <TabsList>
        <TabsTrigger value="essential">Essential Database</TabsTrigger>
        <TabsTrigger value="full">Full Database</TabsTrigger>
      </TabsList>
      <TabsContent value="essential" className="mt-4">
        <DatasetTable dataset={essential} />
      </TabsContent>
      <TabsContent value="full" className="mt-4">
        <DatasetTable dataset={full} />
      </TabsContent>
    </Tabs>
  );
}
