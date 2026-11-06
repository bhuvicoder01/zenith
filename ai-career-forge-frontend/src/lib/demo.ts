export const demoSkills = [
  "TypeScript",
  "React",
  "Java",
  "Spring Boot",
  "PostgreSQL",
  "Python",
  "Django",
  "AWS",
];
export const initialSkills = ["TypeScript", "React", "Java", "Spring Boot"];
export type DemoStatus =
  | "SAVED"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "ARCHIVED";
export type DemoJob = {
  id: string;
  company: string;
  initial: string;
  title: string;
  location: string;
  remote: boolean;
  color: string;
  skills: string[];
  description: string;
  responsibilities: string[];
};
export const demoJobs: DemoJob[] = [
  {
    id: "northstar",
    company: "Northstar Labs",
    initial: "N",
    title: "Full-stack Engineer",
    location: "Remote · India",
    remote: true,
    color: "sage",
    skills: ["TypeScript", "React", "Java", "Spring Boot", "PostgreSQL"],
    description:
      "Help a small product team build considered tools for everyday work. Collaborate across the interface, API, and data layers.",
    responsibilities: [
      "Build accessible React interfaces and typed API integrations.",
      "Develop and test Java services with clear data contracts.",
      "Discuss implementation tradeoffs with the product team.",
    ],
  },
  {
    id: "bloom",
    company: "Bloom Studio",
    initial: "b",
    title: "Frontend Engineer",
    location: "Bengaluru · Hybrid",
    remote: false,
    color: "peach",
    skills: ["TypeScript", "React", "PostgreSQL"],
    description:
      "Make complex workflows feel simple. Join a fictional design-focused team working on responsive, accessible product experiences.",
    responsibilities: [
      "Translate product designs into responsive components.",
      "Make loading, errors, and keyboard navigation feel considered.",
      "Collaborate with backend engineers on data integration.",
    ],
  },
  {
    id: "cedar",
    company: "Cedar Systems",
    initial: "C",
    title: "Backend Engineer",
    location: "Remote · India",
    remote: true,
    color: "lavender",
    skills: ["Python", "Django", "PostgreSQL", "AWS"],
    description:
      "Build dependable services for a fictional operations platform, with attention to clear APIs and observable behavior.",
    responsibilities: [
      "Design and test resource-oriented APIs.",
      "Work with relational data and background processing.",
      "Document failure handling and operational tradeoffs.",
    ],
  },
];
// A transparent demonstration heuristic, independent of the production model.
export function demoMatchScore(
  selectedSkills: string[],
  requiredSkills: string[],
) {
  if (requiredSkills.length === 0) return 0;
  return Math.round(
    (requiredSkills.filter((skill) => selectedSkills.includes(skill)).length /
      requiredSkills.length) *
      100,
  );
}
export function demoCoverNote(
  job: DemoJob,
  skills: string[],
  targetRole: string,
) {
  const relevant = job.skills.filter((skill) => skills.includes(skill));
  return `FICTIONAL DEMO — SAMPLE COVER NOTE\n\nAlex Shah\n${targetRole}\n\nDear ${job.company} team,\n\nI am interested in the ${job.title} role. ${relevant.length ? `The skills in my sample profile that overlap with this role are ${relevant.join(", ")}.` : "I would review the role requirements and develop the relevant skills before applying."}\n\nI would welcome the opportunity to discuss how my background relates to your team's work. Before using a real application, I would add a specific, accurate example from my own experience and review every statement.\n\nThank you for your consideration,\nAlex Shah\n\nThis text is a local template using fictional data. It is not AI-generated, has not been sent, and does not represent an actual candidate or vacancy.`;
}
