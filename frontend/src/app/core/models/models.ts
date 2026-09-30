export type Role = 'CLIENT' | 'FREELANCER' | 'ADMIN';
export type ProjectStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'DISPUTED'
  | 'COMPLETED'
  | 'CANCELLED';
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ContractStatus =
  | 'ACTIVE'
  | 'WORK_SUBMITTED'
  | 'DISPUTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ApiError {
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: ApiError | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * The moderation state the API reports for an account. Deliberately free of
 * admin internals: the member is told they are suspended, why, and until when,
 * but never who applied it.
 */
export interface BanInfo {
  isBanned: true;
  reason: string | null;
  bannedAt: string | null;
  bannedUntil: string | null;
  isPermanent: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  skills: string[];
  profileImage: string;
  balance?: number;
  // Only present for the account itself and for admins; other viewers of a
  // profile never receive these fields.
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string | null;
  bannedUntil?: string | null;
  bannedBy?: { _id: string; name: string; role: Role } | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthData {
  user: User;
  token: string;
}

export interface FreelancerProfile {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: Role;
    bio: string;
    skills: string[];
    profileImage: string;
  };
  title: string;
  bio: string;
  hourlyRate: number;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItem {
  _id: string;
  freelancer: string;
  title: string;
  description: string;
  image: string;
  category: string;
  technologies: string[];
  projectUrl: string;
  linkUrl: string;
  linkLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItemPayload {
  title: string;
  description: string;
  image: string;
  category: string;
  technologies: string[];
  projectUrl: string;
  linkUrl: string;
  linkLabel: string;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  // A project states an open budget range. The same pair bounds any bid on the
  // project, and the server owns the resolved range.
  minBudget: number;
  maxBudget: number;
  durationDays: number;
  skills: string[];
  status: ProjectStatus;
  client: User | string;
  // Attached by the server from the persisted proposal collection, and only for
  // the client who owns the project. Never derived on the client.
  proposalCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListData {
  projects: Project[];
  pagination: Pagination;
}

export interface Proposal {
  _id: string;
  project:
    | {
        _id: string;
        title?: string;
        description?: string;
        minBudget?: number;
        maxBudget?: number;
        durationDays?: number;
        status?: ProjectStatus;
        client?: User | string;
      }
    | string;
  freelancer: User | string;
  coverLetter: string;
  price: number;
  deliveryTime: number;
  status: ProposalStatus;
  // A submitted bid may be revised exactly once. The server enforces the
  // ceiling too, so this only decides whether the edit control is offered.
  editCount?: number;
  // Client read state, persisted on the proposal itself so the All / Seen /
  // Unseen filters survive a refresh. Only the project's own client can set it.
  isSeen?: boolean;
  seenAt?: string | null;
  platformFeePercent?: number;
  platformFeeAmount?: number;
  freelancerNetAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalListData {
  proposals: Proposal[];
  pagination: Pagination;
}

export type ProposalSeenView = 'ALL' | 'SEEN' | 'UNSEEN';

export interface ProposalSeenCounts {
  all: number;
  seen: number;
  unseen: number;
}

/** The response of the client's proposal list for one of their projects. */
export interface ProjectProposalListData extends ProposalListData {
  counts: ProposalSeenCounts;
}

/**
 * The bid range the server accepts for a project. Fetched rather than computed
 * on the client, so the numbers the form shows are the numbers the API enforces.
 */
export interface ProposalLimits {
  min: number;
  max: number;
  minBudget: number;
  maxBudget: number;
  durationDays: number;
  projectStatus: ProjectStatus;
  isOwnProject: boolean;
}

export interface Contract {
  _id: string;
  project: {
    _id: string;
    title: string;
    status: ProjectStatus;
    minBudget: number;
    maxBudget: number;
    client?: User | string;
  };
  proposal: {
    coverLetter: string;
    price: number;
    deliveryTime: number;
  };
  client: User;
  freelancer: User;
  agreedPrice: number;
  startDate: string;
  deadline: string;
  status: ContractStatus;
  workSubmission?: {
    description: string;
    submittedAt: string | null;
    submittedBy: User | string | null;
  } | null;
  workFeedback?: string;
  heldAmount?: number;
  paymentReleased?: boolean;
  platformFeePercent?: number;
  platformFeeAmount?: number;
  freelancerNetAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractListData {
  contracts: Contract[];
  pagination: Pagination;
}

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export type DisputeOutcome = 'RELEASE' | 'REFUND' | 'SPLIT';

export interface Dispute {
  _id: string;
  contract:
    | {
        _id: string;
        agreedPrice: number;
        heldAmount: number;
        paymentReleased: boolean;
        status: ContractStatus;
      }
    | string;
  project: { _id: string; title: string } | string;
  raisedBy: User | string;
  against: User | string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolution: {
    outcome: DisputeOutcome | null;
    amountToFreelancer: number;
    amountToClient: number;
    platformFeeAmount: number;
    note: string;
    resolvedBy: { _id: string; name: string } | string | null;
    resolvedAt: string | null;
  };
  statusHistory: {
    status: string;
    note: string;
    by: string | null;
    at: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface DisputeListData {
  disputes: Dispute[];
  pagination: Pagination;
}

export interface SavedFreelancer {
  id: string;
  savedAt: string;
  freelancer: {
    id: string;
    name: string;
    role: Role;
    bio: string;
    skills: string[];
    profileImage: string;
    createdAt: string;
    updatedAt: string;
  };
}

export type TransactionType = 'CREDIT' | 'DEBIT';

export interface Transaction {
  _id: string;
  user: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number | null;
  contract: { status: ContractStatus } | string | null;
  project: { title: string } | string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletData {
  balance: number;
  transactions: Transaction[];
}

export type NotificationType =
  | 'PROPOSAL'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'CONTRACT_CREATED'
  | 'CONTRACT_UPDATED'
  | 'WORK_SUBMITTED'
  | 'WORK_APPROVED'
  | 'WORK_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'MESSAGE'
  | 'REVIEW'
  | 'SYSTEM';

export interface Notification {
  _id: string;
  user: string;
  actor: User | null;
  type: NotificationType;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListData {
  notifications: Notification[];
  unreadCount: number;
  pagination: Pagination;
}

export interface Message {
  _id: string;
  sender: User;
  receiver: User;
  project: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageListData {
  messages: Message[];
  pagination: Pagination;
}

export interface Conversation {
  project: {
    _id: string;
    title: string;
    status: ProjectStatus;
    client?: User | string;
  };
  other: { name: string; _id: string; profileImage?: string } | null;
  contractStatus: string | null;
}

export interface ConversationListData {
  conversations: Conversation[];
}

export interface Review {
  _id: string;
  contract: string;
  reviewer: User;
  reviewee: User;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListData {
  reviews: Review[];
  pagination: Pagination;
}

export interface UserListData {
  count: number;
  users: User[];
  pagination: Pagination;
}

export interface AnalyticsKpis {
  totalUsers: number;
  clients: number;
  freelancers: number;
  totalProjects: number;
  openProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  totalProposals: number;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  platformFeePercent: number;
  platformRevenue: number;
  avgRating: number;
  totalReviews: number;
}

export interface MonthlyData {
  label: string;
  count: number;
}

export interface MonthlyFeeData {
  label: string;
  total: number;
}

export interface DistributionData {
  label: string;
  value: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKpis;
  roleDistribution: DistributionData[];
  statusDistribution: DistributionData[];
  monthlyProjects: MonthlyData[];
  monthlyFees: MonthlyFeeData[];
  recentActivity: {
    projects: Project[];
    contracts: Contract[];
  };
}

export type AnalyticsActivityType =
  | 'PROJECT_CREATED'
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_RECEIVED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'CONTRACT_STARTED'
  | 'CONTRACT_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_MADE'
  | 'REVIEW_RECEIVED'
  | 'REVIEW_SUBMITTED';

export interface AnalyticsActivityEntry {
  type: AnalyticsActivityType;
  title: string;
  amount: number | null;
  status: string | null;
  at: string;
  link: string;
}

export interface FreelancerAnalyticsKpis {
  totalProposals: number;
  pendingProposals: number;
  acceptedProposals: number;
  rejectedProposals: number;
  acceptanceRate: number | null;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  cancelledContracts: number;
  totalEarnings: number;
  pendingEarnings: number;
  avgRating: number;
  totalReviews: number;
  portfolioItems: number;
  profileCompletion: number;
}

export interface FreelancerAnalyticsData {
  kpis: FreelancerAnalyticsKpis;
  proposalStatus: DistributionData[];
  contractStatus: DistributionData[];
  monthlyEarnings: MonthlyFeeData[];
  recentActivity: AnalyticsActivityEntry[];
}

export interface ClientAnalyticsKpis {
  totalProjects: number;
  openProjects: number;
  inProgressProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  totalProposals: number;
  pendingProposals: number;
  acceptedProposals: number;
  rejectedProposals: number;
  selectionRate: number | null;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalSpent: number;
}

export interface ClientAnalyticsData {
  kpis: ClientAnalyticsKpis;
  projectStatus: DistributionData[];
  proposalStatus: DistributionData[];
  monthlySpending: MonthlyFeeData[];
  recentActivity: AnalyticsActivityEntry[];
}

export type ProjectQuery = {
  search?: string;
  status?: ProjectStatus;
  skill?: string;
  minBudget?: number;
  maxBudget?: number;
  sortBy?: 'createdAt' | 'budget' | 'minBudget' | 'maxBudget' | 'durationDays' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};