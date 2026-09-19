import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkillService } from '../../../core/services/resource.services';
import { Skill } from '../../../core/models/models';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'pl-skills-browse',
  standalone: true,
  imports: [RouterLink, LoadingBlock, EmptyState,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">The catalog</p>
        <h1 class="pl-headline mb-0">Browse skills</h1>
        <p class="pl-muted mt-2 mb-0" style="max-width: 56ch">
          Every project, profile and service on ProLance is tagged with skills
          from this catalog. Start here to find what you need.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (skills().length === 0) {
          <pl-empty-state
            title="The skill catalog is empty"
            body="Skills are managed by the platform administrator."
          />
        } @else {
          <div class="row g-4">
            @for (skill of skills(); track skill._id) {
              <div class="col-12 col-sm-6 col-lg-4">
                <a
                  [routerLink]="['/projects']"
                  [queryParams]="{ skill: skill.name }"
                  class="pl-card pl-card--hover h-100"
                  style="text-decoration: none"
                >
                  <h3 class="pl-card__title mb-1" style="font-size: 1.05rem">
                    {{ skill.name }}
                  </h3>
                  <p class="pl-card__body mb-0">
                    {{ skill.description || 'Browse open projects tagged with this skill.' }}
                  </p>
                  <div class="pl-card__foot mt-3">
                    <span class="pl-faded-link">See matching projects →</span>
                  </div>
                </a>
              </div>
            }
          </div>
          <p class="pl-faint mt-4 mb-0" style="font-size: 0.85rem">
            Showing {{ skills().length }} skills.
          </p>
        }
      </div>
    </section>
  `,
})
export class SkillsBrowse {
  private readonly skillService = inject(SkillService);

  protected readonly loading = signal(true);
  protected readonly skills = signal<Skill[]>([]);

  constructor() {
    this.skillService.getSkills().subscribe({
      next: (skills) => {
        this.skills.set(skills);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}