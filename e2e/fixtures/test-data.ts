// Valid Ed25519 SSH public key for testing
export const TEST_SSH_PUBLIC_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB test@e2e";

export const TEST_SSH_KEY_NAME = "e2e-test-key";

// ── VM Request test data ──────────────────────────────────────────────────

export interface VMRequestTestConfig {
  hostname: string;
  description: string;
  projectType: "ipraktikum" | "thesis" | "chair_project";
  // iPraktikum fields
  teamName?: string;
  coachName?: string;
  projectLead?: string;
  // Thesis fields
  studyLevel?: "BA" | "MA";
  thesisTitle?: string;
  advisor?: string;
  // Chair project fields
  projectName?: string;
  projectDescription?: string;
  responsiblePerson?: string;
  // Resources
  cpuCores?: number;
  ramGb?: number;
  justification?: string;
  // Firewall
  defaultPorts?: boolean;
  additionalPorts?: Array<{
    port: number;
    protocol: "tcp" | "udp";
    reason: string;
    publicAccess?: boolean;
    publicJustification?: string;
  }>;
  // Users
  additionalUsers?: string[];
  // SSH
  sshKeyType: "new" | "existing";
  existingKeyId?: string;
  // Review
  additionalComments?: string;
}

export const VM_REQUEST_CONFIGS: Record<string, VMRequestTestConfig> = {
  ipraktikum_default: {
    hostname: "e2e-iprak-vm",
    description: "E2E test VM for iPraktikum project",
    projectType: "ipraktikum",
    teamName: "Team Alpha",
    coachName: "Prof. Smith",
    projectLead: "Max Mustermann",
    sshKeyType: "new",
  },
  ipraktikum_high_resources: {
    hostname: "e2e-iprak-high",
    description: "E2E test VM with high resources",
    projectType: "ipraktikum",
    teamName: "Team Beta",
    coachName: "Dr. Johnson",
    projectLead: "Erika Musterfrau",
    cpuCores: 8,
    ramGb: 8,
    justification: "Running large-scale integration tests requires extra resources",
    sshKeyType: "existing",
  },
  thesis_ba_with_port: {
    hostname: "e2e-thesis-ba",
    description: "E2E test VM for BA thesis work",
    projectType: "thesis",
    studyLevel: "BA",
    thesisTitle: "Analysis of Distributed Systems",
    advisor: "Prof. Mueller",
    additionalPorts: [
      { port: 8080, protocol: "tcp", reason: "Web application testing" },
    ],
    sshKeyType: "new",
  },
  thesis_ma_full: {
    hostname: "e2e-thesis-ma",
    description: "E2E test VM for MA thesis with all options",
    projectType: "thesis",
    studyLevel: "MA",
    thesisTitle: "Machine Learning Pipeline Optimization",
    advisor: "Dr. Weber",
    cpuCores: 8,
    ramGb: 8,
    justification: "ML training requires significant compute resources",
    additionalPorts: [
      { port: 8080, protocol: "tcp", reason: "Model serving API" },
      { port: 5432, protocol: "tcp", reason: "PostgreSQL database" },
    ],
    additionalUsers: ["collaborator1", "collaborator2"],
    sshKeyType: "new",
    additionalComments: "Need GPU passthrough if possible",
  },
  chair_project_default: {
    hostname: "e2e-chair-vm",
    description: "E2E test VM for chair project",
    projectType: "chair_project",
    projectName: "Distributed Systems Lab",
    projectDescription: "Research infrastructure for distributed systems lab",
    responsiblePerson: "Prof. Schmidt",
    additionalUsers: ["researcher1"],
    sshKeyType: "new",
  },
  chair_project_full: {
    hostname: "e2e-chair-full",
    description: "E2E test VM for chair project with all options",
    projectType: "chair_project",
    projectName: "Research Prototype",
    projectDescription: "Production environment for research prototype",
    responsiblePerson: "Prof. Bauer",
    cpuCores: 8,
    ramGb: 8,
    justification: "Running multiple containers for microservice architecture",
    additionalPorts: [
      { port: 3000, protocol: "tcp", reason: "Frontend dev server" },
    ],
    additionalUsers: ["dev1", "dev2", "dev3"],
    sshKeyType: "existing",
    additionalComments: "Please configure Docker runtime",
  },
  // Reproduction of GitHub issue #1: chair project with public ports and low resources
  issue_1_chair_project_with_public_ports: {
    hostname: "e2e-issue1-vm",
    description: "VM for the research study on ML interpretability",
    projectType: "chair_project",
    projectName: "ml-interpretability",
    projectDescription: "A study to compare different ML explanation methods.",
    responsiblePerson: "Jane Doe",
    cpuCores: 2,
    additionalPorts: [
      { port: 80, protocol: "tcp", reason: "Web server", publicAccess: true, publicJustification: "Standard" },
      { port: 443, protocol: "tcp", reason: "HTTPS server", publicAccess: true, publicJustification: "Standard" },
    ],
    additionalUsers: ["user-one", "user-two"],
    sshKeyType: "new",
  },
};

// ── VM Access Request test data ───────────────────────────────────────────

export interface VMAccessTestConfig {
  hostname: string;
  justification: string;
  contactPerson?: string;
  sshKeyType: "new" | "existing";
  existingKeyId?: string;
  additionalComments?: string;
}

export const VM_ACCESS_CONFIGS: Record<string, VMAccessTestConfig> = {
  new_key_no_contact: {
    hostname: "e2e-target-vm1",
    justification: "I need access to collaborate on the distributed systems project",
    sshKeyType: "new",
  },
  new_key_with_contact: {
    hostname: "e2e-target-vm2",
    justification: "Joining the development team and need SSH access to the build server",
    contactPerson: "Prof. Mueller",
    sshKeyType: "new",
  },
  existing_key_no_contact: {
    hostname: "e2e-target-vm3",
    justification: "Require access for ongoing maintenance and monitoring tasks",
    sshKeyType: "existing",
    additionalComments: "Already have access to related VMs in the same subnet",
  },
  existing_key_with_contact: {
    hostname: "e2e-target-vm4",
    justification: "Need access to the staging environment for integration testing",
    contactPerson: "Dr. Schmidt",
    sshKeyType: "existing",
    additionalComments: "Preferred access hours: 9-18 CET",
  },
};

// ── Artemis Developer Request test data ───────────────────────────────────

export interface ArtemisTestConfig {
  isAuthenticated: boolean;
  // Anonymous fields
  name?: string;
  mainEmail?: string;
  // Common
  githubUsername: string;
  slackEmail: string;
  contactPerson: string;
  advisor: string;
  subteams: string[];
  otherSubteam?: string;
  additionalComments?: string;
}

export const ARTEMIS_CONFIGS: Record<string, ArtemisTestConfig> = {
  auth_single_subteam: {
    isAuthenticated: true,
    githubUsername: "e2e-dev-user",
    slackEmail: "e2e-dev@slack.example.com",
    contactPerson: "Prof. Schmidt",
    advisor: "Dr. Weber",
    subteams: ["ares"],
  },
  auth_multiple_subteams: {
    isAuthenticated: true,
    githubUsername: "e2e-multi-dev",
    slackEmail: "e2e-multi@slack.example.com",
    contactPerson: "Prof. Bauer",
    advisor: "Dr. Klein",
    subteams: ["ares", "iris", "programming"],
  },
  auth_with_other: {
    isAuthenticated: true,
    githubUsername: "e2e-other-dev",
    slackEmail: "e2e-other@slack.example.com",
    contactPerson: "Prof. Fischer",
    advisor: "Dr. Lang",
    subteams: ["ares", "other"],
    otherSubteam: "Custom Research Team",
    additionalComments: "Interested in contributing to a new experimental module",
  },
  anon_single_subteam: {
    isAuthenticated: false,
    name: "External Developer",
    mainEmail: "external.dev@company.com",
    githubUsername: "e2e-ext-dev",
    slackEmail: "ext-dev@slack.example.com",
    contactPerson: "Prof. Mayer",
    advisor: "Dr. Braun",
    subteams: ["apollon"],
  },
  anon_multiple_subteams: {
    isAuthenticated: false,
    name: "Guest Contributor",
    mainEmail: "guest@university.edu",
    githubUsername: "e2e-guest-dev",
    slackEmail: "guest@slack.example.com",
    contactPerson: "Prof. Wolf",
    advisor: "Dr. Richter",
    subteams: ["hephaestus", "operations"],
    additionalComments: "Available to start next Monday",
  },
  anon_with_other: {
    isAuthenticated: false,
    name: "Research Partner",
    mainEmail: "research@partner.org",
    githubUsername: "e2e-research-dev",
    slackEmail: "research@slack.example.com",
    contactPerson: "Prof. Hartmann",
    advisor: "Dr. Vogel",
    subteams: ["quiz", "other"],
    otherSubteam: "Research Collaboration",
  },
};

// ── TUM Guest Request test data ───────────────────────────────────────────

export interface TUMGuestTestConfig {
  isAuthenticated: boolean;
  // Anonymous-only fields
  requestingForSelf?: boolean;
  contactPerson?: string;
  // Guest info
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  gender: "male" | "female" | "diverse";
  nationality: string;
  nationalityOther?: string;
  // Guest type
  guestType: "ipraktikum-customer" | "artemis" | "other";
  teamName?: string;
  coachName?: string;
  universityOrCompany?: string;
  otherReason?: string;
  additionalComments?: string;
}

export const TUM_GUEST_CONFIGS: Record<string, TUMGuestTestConfig> = {
  // Authenticated cases
  auth_ipraktikum_female_german: {
    isAuthenticated: true,
    firstName: "Anna",
    lastName: "Schmidt",
    email: "anna.schmidt@example.com",
    birthDate: "1998-03-15",
    gender: "female",
    nationality: "German",
    guestType: "ipraktikum-customer",
    teamName: "Team Gamma",
    coachName: "Dr. Winter",
  },
  auth_artemis_male_swiss: {
    isAuthenticated: true,
    firstName: "Marco",
    lastName: "Bernasconi",
    email: "marco.b@example.ch",
    birthDate: "1995-07-22",
    gender: "male",
    nationality: "Swiss",
    guestType: "artemis",
    universityOrCompany: "ETH Zurich",
  },
  auth_other_diverse_other_nat: {
    isAuthenticated: true,
    firstName: "Alex",
    lastName: "Silva",
    email: "alex.silva@example.br",
    birthDate: "1997-11-08",
    gender: "diverse",
    nationality: "other",
    nationalityOther: "Brazilian",
    guestType: "other",
    otherReason: "Visiting researcher collaborating on the distributed systems project for six months",
    additionalComments: "Will need access to the lab building as well",
  },
  auth_ipraktikum_male_other_nat: {
    isAuthenticated: true,
    firstName: "Jun",
    lastName: "Park",
    email: "jun.park@example.kr",
    birthDate: "2000-01-20",
    gender: "male",
    nationality: "other",
    nationalityOther: "Korean",
    guestType: "ipraktikum-customer",
    teamName: "Team Delta",
    coachName: "Prof. Lee",
    additionalComments: "Exchange student from KAIST",
  },
  // Anonymous self cases
  anon_self_ipraktikum_male_german: {
    isAuthenticated: false,
    requestingForSelf: true,
    contactPerson: "Prof. Mueller",
    firstName: "Hans",
    lastName: "Weber",
    email: "hans.weber@example.de",
    birthDate: "1999-05-10",
    gender: "male",
    nationality: "German",
    guestType: "ipraktikum-customer",
    teamName: "Team Epsilon",
    coachName: "Dr. Schwarz",
  },
  anon_self_artemis_female_french: {
    isAuthenticated: false,
    requestingForSelf: true,
    contactPerson: "Dr. Dupont",
    firstName: "Marie",
    lastName: "Leclerc",
    email: "marie.l@example.fr",
    birthDate: "1996-09-30",
    gender: "female",
    nationality: "French",
    guestType: "artemis",
    universityOrCompany: "Sorbonne University",
  },
  anon_self_other_diverse_other_nat: {
    isAuthenticated: false,
    requestingForSelf: true,
    contactPerson: "Prof. Tanaka",
    firstName: "Yuki",
    lastName: "Tanaka",
    email: "yuki.t@example.jp",
    birthDate: "1998-02-14",
    gender: "diverse",
    nationality: "other",
    nationalityOther: "Japanese",
    guestType: "other",
    otherReason: "Research collaboration on quantum computing project requiring TUM system access",
    additionalComments: "Arriving in April, need account ready by then",
  },
};

// ── Support Request test data ────────────────────────────────────────────

export interface SupportTestConfig {
  isAuthenticated: boolean;
  // Anonymous fields
  fullName?: string;
  email?: string;
  tumId?: string;
  // Support details
  subject: string;
  category: "bug" | "feature_request" | "question" | "other";
  description: string;
}

export const SUPPORT_CONFIGS: Record<string, SupportTestConfig> = {
  auth_bug: {
    isAuthenticated: true,
    subject: "VM not reachable via SSH",
    category: "bug",
    description: "I cannot connect to my VM via SSH since this morning. The connection times out after 30 seconds.",
  },
  auth_question: {
    isAuthenticated: true,
    subject: "How to increase VM disk space",
    category: "question",
    description: "My VM is running low on disk space. How can I request an increase in storage capacity?",
  },
  anon_feature_request: {
    isAuthenticated: false,
    fullName: "External Researcher",
    email: "researcher@partner-uni.edu",
    tumId: "ext42abc",
    subject: "Support for GPU passthrough",
    category: "feature_request",
    description: "It would be very helpful to have GPU passthrough support for machine learning workloads on VMs.",
  },
  anon_other_no_tumid: {
    isAuthenticated: false,
    fullName: "Guest User",
    email: "guest@example.com",
    subject: "General inquiry about services",
    category: "other",
    description: "I would like to know more about the services offered by AET and how to get started as a new collaborator.",
  },
};
