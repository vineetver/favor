const people = [
  {
    name: "Xihong Lin",
    role: "Advisor",
    imageUrl: "/static/xihong.png",
    bio: "Ultricies massa malesuada viverra cras lobortis. Tempor orci hac ligula dapibus mauris sit ut eu. Eget turpis urna maecenas cras. Nisl dictum.",
  },
  {
    name: "Hufeng Zhou",
    role: "Project Lead",
    imageUrl: "/static/hufeng.png",
    bio: "Ultricies massa malesuada viverra cras lobortis. Tempor orci hac ligula dapibus mauris sit ut eu. Eget turpis urna maecenas cras. Nisl dictum.",
  },
  {
    name: "Shamil Sunyaev",
    role: "Advisor",
    imageUrl: "/static/shamil.png",
    bio: "Ultricies massa malesuada viverra cras lobortis. Tempor orci hac ligula dapibus mauris sit ut eu. Eget turpis urna maecenas cras. Nisl dictum.",
  },
  {
    name: "Vineet Verma",
    role: "Software Engineer Lead",
    imageUrl: "/static/vineet.png",
    bio: "Ultricies massa malesuada viverra cras lobortis. Tempor orci hac ligula dapibus mauris sit ut eu. Eget turpis urna maecenas cras. Nisl dictum.",
  }, // More people...
];

const favorannotatorContributors = [
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
    imageUrl: "",
  },
  {
    name: "Xihong Lin",
    role: "Advisor",
    imageUrl: "/static/xihong.png",
    bio: "Ultricies massa malesuada viverra cras lobortis. Tempor orci hac ligula dapibus mauris sit ut eu. Eget turpis urna maecenas cras. Nisl dictum.",
  },
];

const otherContributors = [
  {
    name: "Theodore Arapoglou",
    role: "Role",
    imageUrl: "",
    bio: "Ultricies massa malesuada viverra cras lobortis. Tempor orci hac ligula dapibus mauris sit ut eu. Eget turpis urna maecenas cras. Nisl dictum.",
  },
  {
    name: "Eric Van Buren",
    imageUrl: "/static/eric.png",
  },
  {
    name: "Xiuwen Zheng",
  },
  {
    name: "Jill Moore",
  },
  {
    name: "Abhijith Asok",
  },
  {
    name: "Sushant Kumar",
  },
  {
    name: "Elizabeth E. Blue",
  },
  {
    name: "Steven Buyske",
  },
  {
    name: "Nancy Cox",
  },
  {
    name: "Adam Felsenfeld",
  },
  {
    name: "Mark Gerstein",
  },
  {
    name: "Eimear Kenny",
  },
  {
    name: "Bingshan Li",
  },
  {
    name: "Tara Matise",
  },
  {
    name: "Anthony Philippakis",
  },
  {
    name: "Heidi Rehm",
  },
  {
    name: "Heidi J. Sofia",
  },
  {
    name: "Grace Snyder",
  },
  {
    name: "Zhiping Weng",
  },
  {
    name: "Benjamin Neale",
  },
  {
    name: "Genevieve Wojcik",
  },
];

export default async function Page() {
  return (
    <>
      <div className="relative">
        <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-20 px-6 lg:px-8 xl:grid-cols-3">
          <div className="max-w-2xl">
            <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Leadership
            </h1>
            <p>
              Thank you for your interest in our project. We are a team of
              researchers and engineers from Harvard University and affiliated
              institutions. We are passionate about building a better future for
              all.
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2">
            {people.map((person) => (
              <li key={person.name}>
                <div className="flex items-center gap-x-6">
                  {person.imageUrl ? (
                    <img
                      className="h-16 w-16 rounded-full"
                      src={person.imageUrl}
                      alt=""
                    />
                  ) : (
                    <svg
                      className="h-16 w-16 fill-gray-300"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  <div>
                    <h3 className="text-lg font-medium leading-7 tracking-tight">
                      {person.name}
                    </h3>
                    <p className="text-sm font-semibold leading-6 text-primary">
                      {person.role}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto mt-20 grid max-w-7xl gap-x-8 gap-y-20 px-6 lg:px-8 xl:grid-cols-3">
          <div className="max-w-2xl">
            <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              FAVORannotator and FAVOR-GPT Developers
            </h1>
            <p>
              We are grateful to the following individuals for their
              contributions to FAVORannotator (An open-source tool to annotate
              variants in VCF files)
            </p>
          </div>
          <ul
            role="list"
            className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2"
          >
            {favorannotatorContributors.map((person) => (
              <li key={person.name}>
                <div className="flex items-center gap-x-6">
                  {person.imageUrl ? (
                    <img
                      className="h-16 w-16 rounded-full"
                      src={person.imageUrl}
                      alt=""
                    />
                  ) : (
                    <svg
                      className="text-gray-300 h-16 w-16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  <div>
                    <h3 className="text-lg font-medium leading-7 tracking-tight">
                      {person.name}
                    </h3>
                    <p className="text-sm font-semibold leading-6 text-primary">
                      {person.role}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto mt-20 grid max-w-7xl gap-x-8 gap-y-20 px-6 lg:px-8 xl:grid-cols-3">
          <div className="max-w-2xl">
            <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Other contributors
            </h1>
            <p>
              NHGRI Genome Sequencing Program Functional Annotation Working
              Group
            </p>
          </div>
          <ul
            role="list"
            className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2"
          >
            {otherContributors.map((person) => (
              <li key={person.name}>
                <div className="flex items-center gap-x-6">
                  {person.imageUrl ? (
                    <img
                      className="h-16 w-16 rounded-full"
                      src={person.imageUrl}
                      alt=""
                    />
                  ) : (
                    <svg
                      className="text-gray-300 h-16 w-16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  <div>
                    <h3 className="text-lg font-medium leading-7 tracking-tight">
                      {person.name}
                    </h3>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
