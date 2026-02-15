import type { Metadata } from "next";
import Image from "next/image";
import { User } from "lucide-react";

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

const people: Person[] = [
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
    imageUrl: "/static/vineet.png",
  },
];

const favorannotatorContributors: Person[] = [
  {
    name: "Hufeng Zhou",
    role: "Lead",
    imageUrl: "/static/hufeng.png",
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
    name: "Tom Li",
    role: "FAVOR-GPT Developer",
  },
  {
    name: "Xihong Lin",
    role: "Advisor",
    imageUrl: "/static/xihong.png",
  },
];

const otherContributors: Person[] = [
  { name: "Theodore Arapoglou", imageUrl: "" },
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

function PersonAvatar({ person }: { person: Person }) {
  if (person.imageUrl) {
    return (
      <Image
        className="h-16 w-16 rounded-full object-cover"
        src={person.imageUrl}
        alt={person.name}
        width={64}
        height={64}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
      <User className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  return (
    <li>
      <div className="flex items-center gap-x-6">
        <PersonAvatar person={person} />
        <div>
          <h3 className="text-lg font-medium leading-7 tracking-tight text-foreground">
            {person.name}
          </h3>
          {person.role && (
            <p className="text-sm font-semibold leading-6 text-primary">
              {person.role}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function TeamPage() {
  return (
    <div className="bg-background py-16 sm:py-24">
      <div className="max-w-page mx-auto px-6 lg:px-12 space-y-20">
        {/* Leadership */}
        <section className="grid max-w-7xl gap-x-8 gap-y-20 xl:grid-cols-3">
          <div className="max-w-2xl">
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Leadership
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Thank you for your interest in our project. We are a team of
              researchers and engineers from Harvard University and affiliated
              institutions. We are passionate about building a better future for
              all.
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2">
            {people.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </ul>
        </section>

        {/* FAVORannotator & FAVOR-GPT */}
        <section className="grid max-w-7xl gap-x-8 gap-y-20 xl:grid-cols-3">
          <div className="max-w-2xl">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              FAVORannotator and FAVOR-GPT Developers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We are grateful to the following individuals for their
              contributions to FAVORannotator (An open-source tool to annotate
              variants in VCF files)
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2">
            {favorannotatorContributors.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </ul>
        </section>

        {/* Other Contributors */}
        <section className="grid max-w-7xl gap-x-8 gap-y-20 xl:grid-cols-3">
          <div className="max-w-2xl">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Other Contributors
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              NHGRI Genome Sequencing Program Functional Annotation Working
              Group
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2">
            {otherContributors.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
