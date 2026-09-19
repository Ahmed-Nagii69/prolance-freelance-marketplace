export type Role = 'CLIENT' | 'FREELANCER' | 'ADMIN';
export type ProjectStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ContractStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

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

export interface Skill {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  _id: string;
  title: string;
  description: string;
  price: number;
  freelancer: User;
  skills: Skill[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
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
        deadline?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ContractListData {
  contracts: Contract[];
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
  deadlineFrom?: string;
  deadlineTo?: string;
  sortBy?: 'createdAt' | 'budget' | 'deadline' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};