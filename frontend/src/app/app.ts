import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toasts } from './shared/components/toasts/toasts.component';
import { ConfirmDialog } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  imports: [RouterOutlet, Toasts, ConfirmDialog],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}