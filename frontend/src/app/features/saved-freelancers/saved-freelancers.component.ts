import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { SavedFreelancerService } from '../../core/services/resource.services';
import { SavedFreelancer } from '../../core/models/models';
import { formatDate, initialsOf } from '../../core/utils/format';
import { EmptyState } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlock } from '../../shared/components/loading/loading.component';
import { SkillTags } from '../../shared/components/skill-tags/skill-tags.component';
import { SaveFreelancerButton } from '../../shared/components/save-freelancer-button/save-freelancer-button.component';

@Component({
  selector: 'pl-saved-freelancers',
  standalone: true,
  imports: [
    RouterLink,
    TablerIconComponent,
    EmptyState,
    LoadingBlock,
    SkillTags,
    SaveFreelancerButton,
  ],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Shortlist</p>
        <h1 class="pl-headline mb-0">Saved freelancers</h1>
        <p class="pl-muted mt-2 mb-0">
          Keep the freelancers you want to work with close at hand.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (saved().length === 0) {
          <pl-empty-state
            title="No saved freelancers yet"
            body="Open a freelancer profile and tap the heart to keep it on your shortlist."
          >
            <a routerLink="/projects" class="pl-btn pl-btn--accent pl-btn--sm" pl-empty-action>
              Browse projects
            </a>
          </pl-empty-state>
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (entry of saved(); track entry.id) {
              <div class="pl-card">
                <div class="d-flex gap-3 align-items-start flex-wrap">
                  <a [routerLink]="['/users', entry.freelancer.id]" class="pl-saved__identity">
                    <span class="pl-avatar pl-avatar--xl">
                      @if (entry.freelancer.profileImage) {
                        <img [src]="entry.freelancer.profileImage" alt="" />
                      } @else {
                        {{ initialsOf(entry.freelancer.name) }}
                      }
                    </span>
                    <span>
                      <span class="pl-card__title">{{ entry.freelancer.name }}</span>
                      <span class="pl-card__meta mb-0">
                        Saved {{ formatDate(entry.savedAt) }}
                      </span>
                    </span>
                  </a>

                  <pl-save-freelancer
                    class="ms-auto"
                    [freelancerId]="entry.freelancer.id"
                    [size]="20"
                    [initialSaved]="true"
                    (savedChange)="onSavedChange($event)"
                  />
                </div>

                @if (entry.freelancer.bio) {
                  <p class="mt-3 mb-0" style="color: var(--pl-ink-soft); line-height: 1.7">
                    {{ entry.freelancer.bio }}
                  </p>
                }

                @if (entry.freelancer.skills.length > 0) {
                  <div class="mt-3">
                    <pl-skill-tags [skills]="entry.freelancer.skills" />
                  </div>
                }

                <div class="pl-card__foot mt-3">
                  <a [routerLink]="['/users', entry.freelancer.id]" class="pl-faded-link">
                    View profile
                    <tabler-icon icon="arrow-right" [size]="15" />
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class SavedFreelancers {
  private readonly savedService = inject(SavedFreelancerService);

  protected readonly loading = signal(true);
  protected readonly saved = signal<SavedFreelancer[]>([]);

  protected readonly formatDate = formatDate;
  protected readonly initialsOf = initialsOf;

  constructor() {
    this.load();
  }

  private load(): void {
    this.savedService.getSavedFreelancers().subscribe({
      next: (items) => {
        this.saved.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  onSavedChange(isSaved: boolean): void {
    if (!isSaved) {
      this.load();
    }
  }
}
