export type Role = 'CLIENT' | 'FREELANCER' | 'ADMIN';
export type ProjectStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ContractStatus =
  | 'ACTIVE'
  | 'WORK_SUBMITTED'
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

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  skills: string[];
  profileImage: string;
  balance?: number;
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

export interface Project {
  _id: string;
  title: string;
  description: string;
  budget: number;
  durationDays: number;
  skills: string[];
  status: ProjectStatus;
  client: User | string;
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
        budget?: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface ProposalListData {
  proposals: Proposal[];
  pagination: Pagination;
}

export interface Contract {
  _id: string;
  project: {
    _id: string;
    title: string;
    status: ProjectStatus;
    budget: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface ContractListData {
  contracts: Contract[];
  pagination: Pagination;
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

export type ProjectQuery = {
  search?: string;
  status?: ProjectStatus;
  skill?: string;
  minBudget?: number;
  maxBudget?: number;
  sortBy?: 'createdAt' | 'budget' | 'durationDays' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};