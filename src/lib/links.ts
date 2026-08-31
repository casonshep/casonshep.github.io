export type Link = {
  label: string; // rendered in the Game of Life pixel font — A-Z and space only
  href: string;
  description: string; // accessible name for screen readers
};

export const links: Link[] = [
  {
    label: "GITHUB",
    href: "https://github.com/casonshep",
    description: "GitHub — code and projects",
  },
  {
    label: "LINKEDIN",
    href: "https://www.linkedin.com/in/casonshep/",
    description: "LinkedIn — professional profile",
  },
  {
    label: "EMAIL",
    href: "mailto:shepacas000@gmail.com",
    description: "Email — get in touch",
  },
];
