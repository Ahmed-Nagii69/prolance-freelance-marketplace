import { Component, ChangeDetectorRef, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TablerIconComponent } from '@tabler/icons-angular';

type AdminTab = 'overview' | 'users' | 'disputes';

@Component({
  selector: 'pl-admin-workspace',
  standalone: true,
  imports: [RouterLink, RouterOutlet, TablerIconComponent],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Administration</p>
        <h1 class="pl-headline mb-0">Admin workspace</h1>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <nav class="admin-tabs" aria-label="Admin sections">
          <a
            routerLink="/admin"
            [class.is-active]="activeTab() === 'overview'"
            class="admin-tab"
          >
            <tabler-icon icon="dashboard" [size]="18" />
            Overview
          </a>
          <a
            routerLink="/admin/users"
            [class.is-active]="activeTab() === 'users'"
            class="admin-tab"
          >
            <tabler-icon icon="users" [size]="18" />
            Users
          </a>
          <a
            routerLink="/admin/disputes"
            [class.is-active]="activeTab() === 'disputes'"
            class="admin-tab"
          >
            <tabler-icon icon="scale" [size]="18" />
            Disputes
          </a>
        </nav>

        <router-outlet />
      </div>
    </section>
  `,
  styles: [
    `
      .admin-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        border-bottom: 1px solid var(--pl-line);
        margin-bottom: 1.75rem;
      }

      .admin-tab {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.7rem 1.15rem;
        font-size: 0.92rem;
        font-weight: 600;
        color: var(--pl-ink-soft);
        text-decoration: none;
        white-space: nowrap;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition:
          color 140ms ease,
          border-color 140ms ease,
          background-color 140ms ease;
      }

      .admin-tab:hover {
        color: var(--pl-petrol);
        background-color: rgba(36, 92, 90, 0.05);
      }

      .admin-tab.is-active {
        color: var(--pl-petrol);
        border-bottom-color: var(--pl-petrol);
      }

      .admin-tab:focus-visible {
        outline: 2px solid var(--pl-petrol);
        outline-offset: 2px;
        border-radius: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .admin-tab {
          transition: none;
        }
      }
    `,
  ],
})
export class AdminWorkspace implements OnInit {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly activeTab = signal<AdminTab>('overview');

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncTab(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
    this.syncTab(this.router.url);
  }

  private syncTab(url: string): void {
    if (url.startsWith('/admin/disputes')) {
      this.activeTab.set('disputes');
      return;
    }
    this.activeTab.set(url.startsWith('/admin/users') ? 'users' : 'overview');
  }
}