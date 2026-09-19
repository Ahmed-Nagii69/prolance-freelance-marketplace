import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AuthService } from '../../core/services/auth.service';
import { initialsOf, roleDisplay } from '../../core/utils/format';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TablerIconComponent],
  template: `
    <header class="pl-header">
      <div class="pl-container">
        <div class="pl-header__inner">
          <a routerLink="/" class="pl-brand" aria-label="ProLance home">
            ProLance<span class="pl-brand__dot">.</span>
          </a>

          <nav
            class="pl-nav"
            [class.is-open]="menuOpen()"
            aria-label="Primary"
          >
            <a routerLink="/projects" routerLinkActive="is-active" class="pl-nav__link">
              Projects
            </a>
            <a routerLink="/services" routerLinkActive="is-active" class="pl-nav__link">
              Services
            </a>

            @if (user(); as currentUser) {
              @if (currentUser.role === 'CLIENT') {
                <a routerLink="/projects/my" routerLinkActive="is-active" class="pl-nav__link">
                  My projects
                </a>
              }
              @if (currentUser.role === 'FREELANCER') {
                <a routerLink="/proposals/my" routerLinkActive="is-active" class="pl-nav__link">
                  My proposals
                </a>
              }
              <a routerLink="/contracts" routerLinkActive="is-active" class="pl-nav__link">
                Contracts
              </a>
              <a routerLink="/messages" routerLinkActive="is-active" class="pl-nav__link">
                Messages
              </a>
              @if (currentUser.role === 'FREELANCER') {
                <a routerLink="/profile/freelancer" routerLinkActive="is-active" class="pl-nav__link">
                  Freelancer profile
                </a>
              }
              @if (currentUser.role === 'ADMIN') {
                <a routerLink="/admin" routerLinkActive="is-active" class="pl-nav__link">
                  Admin
                </a>
              }
            }
          </nav>

          <div class="pl-header__actions">
            @if (user(); as currentUser) {
              <a routerLink="/profile" class="pl-header__user">
                <span class="pl-avatar">{{ initialsOf(currentUser.name) }}</span>
                <span class="d-none d-md-inline">
                  {{
                    currentUser.role === 'ADMIN'
                      ? 'Admin'
                      : roleDisplay(currentUser.role)
                  }}
                </span>
              </a>
              <button
                type="button"
                class="pl-btn pl-btn--outline pl-btn--sm"
                (click)="logout()"
                aria-label="Log out"
              >
                Log out
              </button>
            } @else {
              <a routerLink="/auth/login" class="pl-btn pl-btn--outline pl-btn--sm">
                Log in
              </a>
              <a routerLink="/auth/register" class="pl-btn pl-btn--accent pl-btn--sm">
                Join ProLance
              </a>
            }

            <button
              type="button"
              class="pl-menu-btn"
              (click)="toggleMenu()"
              aria-label="Toggle navigation"
              aria-expanded="false"
            >
              <tabler-icon icon="menu-2" [size]="22" />
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class Header {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = computed<User | null>(() => this.auth.user());
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  logout(): void {
    this.auth.logout();
  }
}