import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ReviewService } from '../../../core/services/resource.services';
import { ToastService } from '../../../core/services/toast.service';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { RatingStars } from '../../../shared/components/stars/stars.component';
import { ProfilePhoto } from '../../../shared/components/profile-photo/profile-photo.component';
import { PortfolioSection } from '../portfolio-section/portfolio-section.component';
import { formatDate, initialsOf } from '../../../core/utils/format';
import { extractApiMessage } from '../../../core/utils/http-error';
import { Review } from '../../../core/models/models';

@Component({
  selector: 'pl-freelancer-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkillTags,
    LoadingBlock,
    RatingStars,
    ProfilePhoto,
    PortfolioSection,
  ],
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
            <div class="pl-panel mb-4">
              <p class="pl-label mb-3">Profile photo</p>
              <pl-profile-photo (imageChange)="profileImage.set($event)" />
            </div>

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
                <span class="pl-avatar pl-avatar--lg">
                  @if (profileImage()) {
                    <img [src]="profileImage()" alt="" />
                  } @else {
                    {{ initialsOf(name()) }}
                  }
                </span>
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
              @if (skills().length > 0) {
                <pl-skill-tags [skills]="skills()" />
              } @else {
                <p class="pl-faint mb-0" style="font-size: 0.9rem">
                  No skills added yet.
                </p>
              }
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="pl-panel">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
              <div>
                <p class="pl-label mb-1">Skills</p>
                <p class="pl-muted mb-0" style="font-size: 0.9rem">
                  This is the only place to manage your skills after
                  registration. Clients see them on your public profile.
                </p>
              </div>
              <span class="pl-faint" style="font-size: 0.85rem">
                {{ skills().length }} / {{ MAX_SKILLS }}
              </span>
            </div>

            @if (skills().length > 0) {
              <div class="d-flex flex-wrap gap-2 mb-3">
                @for (skill of skills(); track skill) {
                  <span class="pl-tag skill-chip">
                    {{ skill }}
                    <button
                      type="button"
                      class="skill-chip__remove"
                      [attr.aria-label]="'Remove ' + skill"
                      (click)="removeSkill(skill)"
                      [disabled]="skillsSaving()"
                    >
                      &times;
                    </button>
                  </span>
                }
              </div>
            } @else {
              <p class="pl-muted mb-3">
                No skills yet. Add the tools and strengths you want clients to
                find you by.
              </p>
            }

            <div class="d-flex align-items-start gap-2 flex-wrap">
              <div class="pl-field mb-0" style="flex: 1 1 16rem">
                <label class="pl-label-inline" for="fp-skill-input">Add a skill</label>
                <input
                  id="fp-skill-input"
                  type="text"
                  class="pl-input"
                  maxlength="40"
                  [(ngModel)]="skillDraft"
                  (keydown.enter)="addSkill($event)"
                  name="skillDraft"
                  placeholder="typescript"
                />
              </div>
              <button
                type="button"
                class="pl-btn pl-btn--outline mt-auto"
                (click)="addSkill()"
                [disabled]="skillsSaving()"
              >
                Add
              </button>
            </div>

            @if (skillsError(); as message) {
              <div class="pl-message mt-3 mb-0" style="color: var(--pl-burgundy)" role="alert">
                {{ message }}
              </div>
            }

            <div class="d-flex align-items-center gap-3 mt-3 flex-wrap">
              <button
                type="button"
                class="pl-btn pl-btn--accent"
                (click)="saveSkills()"
                [disabled]="skillsSaving() || !skillsDirty()"
              >
                {{ skillsSaving() ? 'Saving…' : 'Save skills' }}
              </button>
              @if (skillsDirty() && !skillsSaving()) {
                <button type="button" class="pl-btn pl-btn--outline" (click)="resetSkills()">
                  Discard changes
                </button>
                <span class="pl-faint" style="font-size: 0.85rem">Unsaved changes</span>
              }
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="pl-panel">
            <pl-portfolio-section [editable]="true" />
          </div>
        </div>

        <div class="mt-4">
          <div class="pl-panel">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <p class="pl-label mb-0">Reviews from clients</p>
            </div>
            @if (reviewsLoaded() && reviews().length === 0) {
              <p class="pl-muted mb-0">
                No reviews yet. Completed contracts unlock verified reviews.
              </p>
            } @else if (reviews().length > 0) {
              <div class="d-flex flex-column gap-3">
                @for (review of reviews(); track review._id) {
                  <div class="pl-review">
                    <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                      <pl-stars [rating]="review.rating" />
                      <span class="pl-faint" style="font-size: 0.8rem">
                        {{ formatDate(review.createdAt) }}
                      </span>
                    </div>
                    <p
                      class="mb-1 mt-2"
                      style="color: var(--pl-ink-soft); line-height: 1.6"
                    >
                      {{ review.comment }}
                    </p>
                    <p class="pl-faint mb-0" style="font-size: 0.85rem">
                      — {{ reviewerName(review) }}
                    </p>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .skill-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding-right: 0.35rem;
      }

      .skill-chip__remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background-color: transparent;
        color: inherit;
        font-size: 1.05rem;
        line-height: 1;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 120ms ease, background-color 120ms ease;
      }

      .skill-chip__remove:hover:not(:disabled) {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.08);
      }

      .skill-chip__remove:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
    `,
  ],
})
export class FreelancerProfilePage {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly reviewService = inject(ReviewService);
  private readonly toast = inject(ToastService);

  /** Mirrors the "at most N skills" rule already enforced by the models. */
  protected readonly MAX_SKILLS = 30;

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly title = signal('');
  protected readonly bio = signal('');
  protected readonly hourlyRate = signal(0);

  protected readonly name = signal('Freelancer');
  protected readonly profileImage = signal('');
  protected readonly initialsOf = initialsOf;

  protected readonly skills = signal<string[]>([]);
  protected readonly savedSkills = signal<string[]>([]);
  protected readonly skillsSaving = signal(false);
  protected readonly skillsError = signal('');
  protected skillDraft = '';
  protected readonly skillsDirty = computed(
    () => this.skills().join('|') !== this.savedSkills().join('|'),
  );

  protected readonly reviews = signal<Review[]>([]);
  protected readonly reviewsLoaded = signal(false);
  protected readonly formatDate = formatDate;

  constructor() {
    const current = this.auth.user();
    if (current) {
      this.name.set(current.name);
      this.profileImage.set(current.profileImage);
      this.setSkills(current.skills);
      this.loadReviews(current._id);
    }
    this.userService.getFreelancerProfile().subscribe({
      next: (profile) => {
        this.title.set(profile.title);
        this.bio.set(profile.bio);
        this.hourlyRate.set(profile.hourlyRate);
        // Registration stores skills on the account, the freelancer profile
        // keeps its own copy. Prefer the account list, fall back to the
        // profile list for freelancers who registered before this existed.
        if (this.skills().length === 0) {
          this.setSkills(profile.skills);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private setSkills(skills: string[]): void {
    this.skills.set(skills);
    this.savedSkills.set(skills);
  }

  private loadReviews(userId: string): void {
    this.reviewService.getUserReviews(userId, 1, 50).subscribe({
      next: (data) => {
        this.reviews.set(data.reviews);
        this.reviewsLoaded.set(true);
      },
      error: () => {
        this.reviewsLoaded.set(true);
      },
    });
  }

  reviewerName(review: Review): string {
    if (typeof review.reviewer === 'object' && review.reviewer !== null) {
      return review.reviewer.name;
    }
    return 'Client';
  }

  save(): void {
    const payload = {
      title: this.title().trim(),
      bio: this.bio(),
      hourlyRate: Number(this.hourlyRate()),
    };
    this.submitting.set(true);
    this.error.set('');
    this.userService.updateFreelancerProfile(payload).subscribe({
      next: () => {
        this.toast.success('Freelancer profile updated.');
        this.submitting.set(false);
        void this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'Unable to save your freelancer profile.'));
        this.submitting.set(false);
      },
    });
  }

  addSkill(event?: Event): void {
    event?.preventDefault();
    const skill = this.skillDraft.trim().toLowerCase();
    this.skillDraft = '';

    if (!skill) return;
    if (this.skills().includes(skill)) {
      this.skillsError.set(`"${skill}" is already in your skills.`);
      return;
    }
    if (this.skills().length >= this.MAX_SKILLS) {
      this.skillsError.set(`You can have at most ${this.MAX_SKILLS} skills.`);
      return;
    }

    this.skillsError.set('');
    this.skills.set([...this.skills(), skill]);
  }

  removeSkill(skill: string): void {
    this.skillsError.set('');
    this.skills.set(this.skills().filter((item) => item !== skill));
  }

  resetSkills(): void {
    this.skillsError.set('');
    this.skillDraft = '';
    this.skills.set([...this.savedSkills()]);
  }

  saveSkills(): void {
    const skills = [...this.skills()];
    this.skillsSaving.set(true);
    this.skillsError.set('');

    // Both lists are the same set of skills: the account list is what clients
    // see on the public profile, the freelancer profile list keeps the
    // freelancer workspace in sync. Reuse the existing endpoints for both.
    forkJoin({
      account: this.userService.updateProfile({ skills }),
      profile: this.userService.updateFreelancerProfile({ skills }),
    }).subscribe({
      next: ({ account }) => {
        this.auth.adoptUser(account);
        this.setSkills(skills);
        this.toast.success('Skills updated.');
        this.skillsSaving.set(false);
      },
      error: (err) => {
        this.skillsError.set(extractApiMessage(err, 'Unable to save your skills.'));
        this.skillsSaving.set(false);
      },
    });
  }
}