import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toasts } from './shared/components/toasts/toasts.component';
import { ConfirmDialog } from './shared/components/confirm-dialog/confirm-dialog.component';
import { BanDialog } from './shared/components/ban-dialog/ban-dialog.component';
import { DisputeNotice } from './shared/components/dispute-notice/dispute-notice.component';
import { AccountSuspended } from './shared/components/account-suspended/account-suspended.component';

@Component({
  imports: [
    RouterOutlet,
    Toasts,
    ConfirmDialog,
    BanDialog,
    DisputeNotice,
    AccountSuspended,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
