export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location?: string;
  title?: string;
  summary?: string;
  skills?: Record<string, string[]>;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  roles?: string[];
  subscriptionTier?: "FREE" | "GOLD" | "PLATINUM";
}

export interface ResumeAnalysis {
  id: string;
  atsScore: number;
  scoreLabel: string;
  missingFields: string[];
  suggestions: string[];
  strengths: string[];
  lengthAssessment: string;
  wordCount: number;
}

export interface ResumeContact {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ResumeExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  bullets: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeData {
  name?: string;
  contact?: ResumeContact;
  summary?: string;
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  skills?: { technical?: string[]; soft?: string[]; languages?: string[] };
  projects?: ResumeProject[];
  certifications?: ResumeCertification[];
}

export interface GeneratedResume {
  id: string;
  resumeData: ResumeData | null;
  previewData: Partial<ResumeData>;
  atsScore: number;
  paid: boolean;
  generatedAt: string;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  resumeId: string;
  displayPrice: string;
  displayCurrency: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Job {
  id: string;
  externalId?: string;
  source: "INDEED" | "LINKEDIN";
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  salary?: string;
  tags?: string[];
  jobType?: string;
  datePosted?: string;
  matchScore?: number;
}

export interface CoverLetter {
  id: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  content: string;
  aiProvider: string;
  aiModel?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  job: Job;
  status: ApplicationStatus;
  matchScore?: number;
  notes?: string;
  appliedAt: string;
  statusUpdated: string;
  hasCoverLetter: boolean;
}

export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "INTERVIEWING"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";

export interface Template {
  id: string;
  name: string;
  content: string;
  description?: string;
  isSystem: boolean;
}

export interface Resume {
  id: string;
  filename: string;
  fileSize?: number;
  parsedText?: string;
  parsedData?: {
    email?: string;
    phone?: string;
    skills?: string[];
    wordCount?: number;
    hasExperience?: boolean;
    hasEducation?: boolean;
    hasProjects?: boolean;
  };
  isPrimary: boolean;
  createdAt: string;
}

export interface ResumeProfileContact {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ResumeProfileExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  bullets: string[];
}

export interface ResumeProfileEducation {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
}

export interface ResumeProfileProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ResumeProfileCertification {
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeProfilePreferences {
  noticePeriod?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  workType?: string;
}

export interface ResumeProfile {
  id?: string;
  userId: string;
  sourceResumeId?: string;
  contact?: ResumeProfileContact;
  headline?: string;
  summary?: string;
  yearsOfExperience?: number;
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "STAFF" | "PRINCIPAL";
  experience?: ResumeProfileExperience[];
  education?: ResumeProfileEducation[];
  skills?: Record<string, string[]>;
  projects?: ResumeProfileProject[];
  certifications?: ResumeProfileCertification[];
  targetRoles?: string[];
  preferences?: ResumeProfilePreferences;
  customTags?: Record<string, unknown>;
  version: number;
  updatedAt?: string;
}

export interface Analytics {
  totalApplications: number;
  applied: number;
  interviewing: number;
  offered: number;
  rejected: number;
  responseRate: number;
  byStatus: Record<string, number>;
  bySource?: Record<string, number>;
}

export interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}
