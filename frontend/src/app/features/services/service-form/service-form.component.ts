import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ServiceService,
  SkillService,
} from '../../../core/services/resource.services';
import { ToastService } from '../../../core/services/toast.service';
import { Skill } from '../../../core/models/models';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-service-form',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Freelancer workspace</p>
        <h1 class="pl-headline mb-0">Offer a service</h1>
        <p class="pl-muted mt-2 mb-0" style="max-width: 56ch">
          Describe a fixed-price deliverable, choose your skills, and clients
          can hire you instantly.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="row">
          <div class="col-12 col-lg-8">
            <div class="pl-panel">
              <form (ngSubmit)="save()" novalidate>
                <div class="pl-field">
                  <label class="pl-label-inline" for="sf-title">Title</label>
                  <input
                    id="sf-title"
                    type="text"
                    class="pl-input"
                    required
                    minlength="3"
                    maxlength="100"
                    [(ngModel)]="title"
                    name="title"
                    placeholder="e.g. Landing page built in 5 days"
                  />
                </div>
                <div class="pl-field">
                  <label class="pl-label-inline" for="sf-price">Price (USD)</label>
                  <input
                    id="sf-price"
                    type="number"
                    class="pl-input"
                    required
                    min="5"
                    step="0.01"
                    [(ngModel)]="price"
                    name="price"
                  />
                </div>
                <div class="pl-field">
                  <label class="pl-label-inline" for="sf-desc">What the client gets</label>
                  <textarea
                    id="sf-desc"
                    class="pl-textarea"
                    required
                    maxlength="5000"
                    [(ngModel)]="description"
                    name="description"
                    rows="6"
                    placeholder="Deliverables, revisions included, timeline, what you need from the client."
                  ></textarea>
                </div>

                <div class="pl-field">
                  <span class="pl-label-inline">Skills (pick up to 30)</span>
                  @if (skills().length === 0) {
                    <p class="pl-hint mb-0">The skill catalog is empty.</p>
                  } @else {
                    <div class="d-flex flex-wrap gap-2 mt-2">
                      @for (skill of skills(); track skill._id) {
                        <button
                          type="button"
                          class="pl-chip"
                          [class.is-selected]="selectedIds().includes(skill._id)"
                          (click)="toggleSkill(skill._id)"
                        >
                          {{ skill.name }}
                        </button>
                      }
                    </div>
                  }
                </div>

                @if (error(); as message) {
                  <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
                    {{ message }}
                  </div>
                }

                <div class="d-flex gap-2 flex-wrap">
                  <button
                    type="submit"
                    class="pl-btn pl-btn--accent"
                    [disabled]="submitting()"
                  >
                    {{ submitting() ? 'Publishing…' : 'Publish service' }}
                  </button>
                  <a routerLink="/services" class="pl-btn pl-btn--outline">
                    Cancel
                  </a>
                </div>
              </form>
            </div>
          </div>

          <div class="col-12 col-lg-4">
            <div class="pl-panel">
              <p class="pl-label">Tips</p>
              <ul class="mb-0" style="padding-left: 1.1rem; color: var(--pl-ink-soft); font-size: 0.92rem; display: grid; gap: 0.5rem">
                <li>Set a price that reflects the deliverable.</li>
                <li>Be explicit about revisions and timeline.</li>
                <li>Skills must come from the platform catalog.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ServiceForm {
  private readonly serviceService = inject(ServiceService);
  private readonly skillService = inject(SkillService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly price = signal<number | null>(null);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly skills = signal<Skill[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.skillService.getSkills().subscribe({
      next: (skills) => this.skills.set(skills),
      error: () => void 0,
    });
  }

  toggleSkill(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }

  save(): void {
    const title = this.title().trim();
    const description = this.description().trim();
    const price = Number(this.price());

    if (title.length < 3 || !description || !Number.isFinite(price) || price < 5) {
      this.error.set('Title, description and a price of at least $5 are required.');
      return;
    }
    if (this.selectedIds().length === 0) {
      this.error.set('Choose at least one skill.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    this.serviceService
      .createService({
        title,
        description,
        price,
        skills: this.selectedIds(),
      })
      .subscribe({
        next: () => {
          this.toast.success('Service published.');
          void this.router.navigateByUrl('/services');
        },
        error: (err) => {
          this.error.set(extractApiMessage(err, 'Unable to publish the service.'));
          this.submitting.set(false);
        },
      });
  }
}