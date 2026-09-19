import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { initialsOf } from '../../../core/utils/format';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-freelancer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SkillTags, LoadingBlock,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Freelancer workspace</p>
        <h1 class="pl-headline mb-0">Your freelancer profile</h1>
        <p class="pl-muted mt-2 mb-0" style="max-width: 56ch">
          A complete profile helps you win projects. Clients see this when they
          review your proposals.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="row">
          <div class="col-12 col-lg-8">
            <div class="pl-panel">
              @if (loading()) {
                <pl-loading />
              } @else {
                <form (ngSubmit)="save()" novalidate>
                  <div class="pl-field">
                    <label class="pl-label-inline" for="fp-title">Headline title</label>
                    <input
                      id="fp-title"
                      type="text"
                      class="pl-input"
                      maxlength="60"
                      [(ngModel)]="title"
                      name="title"
                      placeholder="e.g. Full-stack developer focused on fast web apps"
                    />
                  </div>
                  <div class="row g-3">
                    <div class="col-12 col-sm-6">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="fp-rate">Hourly rate (USD)</label>
                        <input
                          id="fp-rate"
                          type="number"
                          class="pl-input"
                          min="0"
                          step="0.01"
                          [(ngModel)]="hourlyRate"
                          name="hourlyRate"
                        />
                      </div>
                    </div>
                    <div class="col-12 col-sm-6">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="fp-skills">
                          Skills (comma separated, lowercase)
                        </label>
                        <input
                          id="fp-skills"
                          type="text"
                          class="pl-input"
                          [(ngModel)]="skillsCsv"
                          name="skills"
                          placeholder="typescript, react, node"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="pl-field">
                    <label class="pl-label-inline" for="fp-bio">Bio</label>
                    <textarea
                      id="fp-bio"
                      class="pl-textarea"
                      maxlength="2000"
                      [(ngModel)]="bio"
                      name="bio"
                      rows="6"
                      placeholder="Your experience, approach and what makes you a great fit."
                    ></textarea>
                  </div>
                  @if (error(); as message) {
                    <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
                      {{ message }}
                    </div>
                  }
                  <button
                    type="submit"
                    class="pl-btn pl-btn--accent"
                    [disabled]="submitting()"
                  >
                    {{ submitting() ? 'Saving…' : 'Save freelancer profile' }}
                  </button>
                </form>
              }
            </div>
          </div>

          <div class="col-12 col-lg-4">
            <div class="pl-panel" style="top: 90px">
              <p class="pl-label">Public preview</p>
              <div class="d-flex align-items-center gap-3 mb-3">
                <span class="pl-avatar pl-avatar--lg">{{ initialsOf(name()) }}</span>
                <div>
                  <p class="mb-0 fw-semibold">{{ name() }}</p>
                  <p class="pl-faint mb-0" style="font-size: 0.9rem">
                    {{ title() || 'Freelancer' }}
                  </p>
                </div>
              </div>
              @if (hourlyRate() > 0) {
                <div class="pl-stat mb-3">
                  <span class="pl-stat__value" style="font-size: 1.5rem">
                    {{ hourlyRate() | currency }}
                  </span>
                  <span class="pl-stat__label">per hour</span>
                </div>
              }
              <p class="pl-label" style="margin-top: 1rem">Current skills</p>
              @if (tags(); as tagsList) {
                <pl-skill-tags [skills]="tagsList" />
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class FreelancerProfilePage {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly title = signal('');
  protected readonly bio = signal('');
  protected readonly hourlyRate = signal(0);
  protected readonly skillsCsv = signal('');

  protected readonly name = signal('Freelancer');
  protected readonly initialsOf = initialsOf;

  protected readonly tags = signal<string[]>([]);

  constructor() {
    const current = this.auth.user();
    if (current) {
      this.name.set(current.name);
    }
    this.userService.getFreelancerProfile().subscribe({
      next: (profile) => {
        this.title.set(profile.title);
        this.bio.set(profile.bio);
        this.hourlyRate.set(profile.hourlyRate);
        this.skillsCsv.set(profile.skills.join(', '));
        this.tags.set(profile.skills.slice(0, 6));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    const payload = {
      title: this.title().trim(),
      bio: this.bio(),
      hourlyRate: Number(this.hourlyRate()),
      skills: this.skillsCsv()
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0),
    };
    this.submitting.set(true);
    this.error.set('');
    this.userService.updateFreelancerProfile(payload).subscribe({
      next: (profile) => {
        this.tags.set(profile.skills.slice(0, 6));
        this.toast.success('Freelancer profile updated.');
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'Unable to save your freelancer profile.'));
        this.submitting.set(false);
      },
    });
  }
}