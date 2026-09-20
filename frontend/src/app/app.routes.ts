import { Routes } from '@angular/router';
import { AppShell } from './layout/shell/app-shell.component';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { Home } from './features/home/home.component';
import { Login } from './features/auth/login/login.component';
import { Register } from './features/auth/register/register.component';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password.component';
import { ProjectsBrowse } from './features/projects/browse/projects-browse.component';
import { ProjectDetails } from './features/projects/details/project-details.component';
import { ProjectForm } from './features/projects/form/project-form.component';
import { MyProjects } from './features/projects/my-projects/my-projects.component';
import { ProjectProposals } from './features/projects/project-proposals/project-proposals.component';
import { MyProposals } from './features/proposals/my-proposals/my-proposals.component';
import { Contracts } from './features/contracts/contracts-list/contracts-list.component';
import { ContractDetails } from './features/contracts/contract-details/contract-details.component';
import { MessagesHub } from './features/messages/messages-hub/messages-hub.component';
import { ProjectConversation } from './features/messages/project-conversation/project-conversation.component';
import { ProfileHome } from './features/profile/profile-home/profile-home.component';
import { FreelancerProfilePage } from './features/profile/freelancer-profile/freelancer-profile.component';
import { UserProfile } from './features/users/user-profile/user-profile.component';
import { AdminWorkspace } from './features/admin/admin-workspace/admin-workspace.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', component: Home },
      {
        path: 'auth',
        canActivate: [guestGuard],
        children: [
          { path: 'login', component: Login },
          { path: 'register', component: Register },
          { path: 'forgot-password', component: ForgotPassword },
          { path: '**', redirectTo: 'login', pathMatch: 'full' },
        ],
      },
      {
        path: 'projects',
        children: [
          { path: '', component: ProjectsBrowse },
          {
            path: 'new',
            component: ProjectForm,
            canActivate: [authGuard, roleGuard(['CLIENT'])],
          },
          {
            path: 'my',
            component: MyProjects,
            canActivate: [authGuard, roleGuard(['CLIENT'])],
          },
          {
            path: ':id/proposals',
            component: ProjectProposals,
            canActivate: [authGuard, roleGuard(['CLIENT'])],
          },
          {
            path: ':id/edit',
            component: ProjectForm,
            canActivate: [authGuard, roleGuard(['CLIENT'])],
          },
          { path: ':id', component: ProjectDetails },
        ],
      },
      {
        path: 'proposals/my',
        component: MyProposals,
        canActivate: [authGuard, roleGuard(['FREELANCER'])],
      },
      {
        path: 'contracts/:id',
        component: ContractDetails,
        canActivate: [authGuard],
      },
      { path: 'contracts', component: Contracts, canActivate: [authGuard] },
      { path: 'messages', component: MessagesHub, canActivate: [authGuard, roleGuard(['CLIENT', 'FREELANCER'])] },
      {
        path: 'messages/project/:projectId',
        component: ProjectConversation,
        canActivate: [authGuard, roleGuard(['CLIENT', 'FREELANCER'])],
      },
      { path: 'profile', component: ProfileHome, canActivate: [authGuard] },
      {
        path: 'profile/freelancer',
        component: FreelancerProfilePage,
        canActivate: [authGuard, roleGuard(['FREELANCER'])],
      },
      {
        path: 'users/:id',
        component: UserProfile,
        canActivate: [authGuard],
      },
      {
        path: 'admin',
        component: AdminWorkspace,
        canActivate: [authGuard, roleGuard(['ADMIN'])],
        children: [
          { path: '', component: AdminWorkspace, canActivate: [authGuard, roleGuard(['ADMIN'])] },
          { path: 'users', component: AdminWorkspace, canActivate: [authGuard, roleGuard(['ADMIN'])] },
          { path: '**', redirectTo: '', pathMatch: 'full' },
        ],
      },
      { path: '**', redirectTo: '', pathMatch: 'full' },
    ],
  },
];