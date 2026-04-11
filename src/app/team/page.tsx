import { Badge } from "@shared/components/ui/badge";
import type { Metadata } from "next";
import { Avatar } from "./avatar";

export const metadata: Metadata = {
  title: "Team | FAVOR",
  description:
    "Meet the team behind FAVOR - researchers and engineers from Harvard University and affiliated institutions.",
};

interface Person {
  name: string;
  role?: string;
  imageUrl?: string;
}

const leadership: Person[] = [
  {
    name: "Xihong Lin",
    role: "Advisor",
    imageUrl: "/static/xihong.png",
  },
  {
    name: "Hufeng Zhou",
    role: "Project Lead",
    imageUrl: "/static/hufeng.png",
  },
  {
    name: "Shamil Sunyaev",
    role: "Advisor",
    imageUrl: "/static/shamil.png",
  },
  {
    name: "Vineet Verma",
    role: "Software Engineer Lead",
    imageUrl: "/static/vineet.jpeg",
  },
];

const favorannotatorContributors: Person[] = [
  {
    name: "Hufeng Zhou",
    role: "Lead",
    imageUrl: "/static/hufeng.png",
  },
  {
    name: "Vineet Verma",
    role: "Software Engineer Lead",
    imageUrl: "/static/vineet.jpeg",
  },
  {
    name: "Tom Li",
    role: "FAVOR-GPT Developer",
  },
  {
    name: "Zilin Li",
    role: "Co-Lead",
    imageUrl: "/static/zilin.png",
  },
  {
    name: "Xihao Li",
    role: "Co-Lead",
    imageUrl: "/static/xihao.png",
  },
  {
    name: "Xihong Lin",
    role: "Advisor",
    imageUrl: "/static/xihong.png",
  },
];

const otherContributors: Person[] = [
  { name: "Theodore Arapoglou" },
  { name: "Eric Van Buren", imageUrl: "/static/eric.png" },
  { name: "Xiuwen Zheng" },
  { name: "Jill Moore" },
  { name: "Abhijith Asok" },
  { name: "Sushant Kumar" },
  { name: "Elizabeth E. Blue" },
  { name: "Steven Buyske" },
  { name: "Nancy Cox" },
  { name: "Adam Felsenfeld" },
  { name: "Mark Gerstein" },
  { name: "Eimear Kenny" },
  { name: "Bingshan Li" },
  { name: "Tara Matise" },
  { name: "Anthony Philippakis" },
  { name: "Heidi Rehm" },
  { name: "Heidi J. Sofia" },
  { name: "Grace Snyder" },
  { name: "Zhiping Weng" },
  { name: "Benjamin Neale" },
  { name: "Genevieve Wojcik" },
];

export default function TeamPage() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        {/* Page header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Our Team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Researchers and engineers from Harvard University and affiliated
            institutions working to advance variant functional annotation.
          </p>
        </div>

        {/* Leadership */}
        <section className="mt-20">
          <div className="flex items-center gap-3 mb-10">
            <h2 className="text-xl font-semibold text-foreground whitespace-nowrap">
              Leadership
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((person) => (
              <div
                key={person.name}
                className="group flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:bg-accent/50"
              >
                <Avatar
                  name={person.name}
                  imageUrl={person.imageUrl}
                  size="lg"
                />
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  {person.name}
                </h3>
                {person.role && (
                  <Badge variant="secondary" className="mt-2">
                    {person.role}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FAVORannotator & FAVOR-GPT */}
        <section className="mt-20">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-foreground whitespace-nowrap">
              FAVORannotator & FAVOR-GPT
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="mb-10 text-sm text-muted-foreground max-w-xl">
            Contributors to FAVORannotator, an open-source tool to annotate
            variants in VCF files, and the FAVOR-GPT natural language interface.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorannotatorContributors.map((person) => (
              <div
                key={person.name}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-accent/50"
              >
                <Avatar
                  name={person.name}
                  imageUrl={person.imageUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {person.name}
                  </h3>
                  {person.role && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {person.role}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Other Contributors */}
        <section className="mt-20">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-foreground whitespace-nowrap">
              Contributors
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="mb-10 text-sm text-muted-foreground max-w-xl">
            NHGRI Genome Sequencing Program Functional Annotation Working Group
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {otherContributors.map((person) => (
              <div
                key={person.name}
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/50"
              >
                <Avatar
                  name={person.name}
                  imageUrl={person.imageUrl}
                  size="sm"
                />
                <span className="text-sm text-foreground truncate">
                  {person.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
