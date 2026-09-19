import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header.component';
import { Footer } from '../footer/footer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  template: `
    <div class="pl-page">
      <app-header />
      <main class="pl-main">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class AppShell {}