import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ReviewService,
  ServiceService,
} from '../../../core/services/resource.services';
import { UserService } from '../../../core/services/user.service';
import { Review, ReviewListData, Service, User } from '../../../core/models/models';
import {
  formatCurrency,
  formatDate,
  initialsOf,
  roleDisplay,
} from '../../../core/utils/format';
import { RatingStars } from '../../../shared/components/stars/stars.component';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'pl-user-profile',
  standalone: true,
  imports: [SkillTags, PaginationControls, LoadingBlock, EmptyState, RatingStars],
  template: `
    @if (loading()) {
      <div class="pl-container" style="padding-block: 4rem">
        <pl-loading />
      </div>
    } @else if (!user()) {
      <div class="pl-container" style="padding-block: 4rem">
        <pl-empty-state
          title="User not found"
          body="This profile doesn't exist or has been removed."
        />
      </div>
    } @else {
      <div class="pl-page-title">
        <div class="pl-container">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <span class="pl-avatar pl-avatar--xl">{{ initialsOf(user()!.name) }}</span>
            <div>
              <h1 class="pl-headline mb-1">{{ user()!.name }}</h1>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="pl-tag pl-tag--dark">{{ roleDisplay(user()!.role) }}</span>
                <span class="pl-faint" style="font-size: 0.85rem">
                  Joined {{ formatDate(user()!.createdAt) }}
                </span>
              </div>
            </div>
            <div class="ms-auto text-end">
              <div class="pl-rating">
                <pl-stars [rating]="averageRating()" />
                <span class="pl-rating__number">
                  {{ averageRating().toFixed(1) }}
                </span>
              </div>
              <p class="pl-faint mb-0" style="font-size: 0.85rem">
                {{ reviewsTotal() }} review(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      <section class="pl-section pl-section--tight">
        <div class="pl-container">
          <div class="row g-4">
            <div class="col-12 col-lg-8">
              @if (user()!.bio) {
                <div class="pl-panel mb-4">
                  <p class="pl-label">About</p>
                  <p style="line-height: 1.8; color: var(--pl-ink-soft); white-space: pre-line">
                    {{ user()!.bio }}
                  </p>
                </div>
              }

              <div class="pl-panel mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <p class="pl-label mb-0">Reviews</p>
                </div>
                @if (reviews().length === 0) {
                  <p class="pl-muted mb-0">No reviews yet.</p>
                } @else {
                  <div class="d-flex flex-column gap-3">
                    @for (review of reviews(); track review._id) {
                      <div class="pl-review">
                        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                          <pl-stars [rating]="review.rating" />
                          <span class="pl-faint" style="font-size: 0.8rem">
                            {{ formatDate(review.createdAt) }}
                          </span>
                        </div>
                        <p class="mb-1 mt-2" style="color: var(--pl-ink-soft); line-height: 1.6">
                          {{ review.comment }}
                        </p>
                        <p class="pl-faint mb-0" style="font-size: 0.85rem">
                          — {{ review.reviewer.name }}
                        </p>
                      </div>
                    }
                  </div>

                  @if (pagination(); as pagination) {
                    <div class="mt-4">
                      <pl-pagination [data]="pagination" (pageChange)="goToPage($event)" />
                    </div>
                  }
                }
              </div>
            </div>

            <div class="col-12 col-lg-4">
              @if (services().length > 0) {
                <div class="pl-panel mb-4" style="top: 90px">
                  <p class="pl-label">Services</p>
                  <div class="d-flex flex-column gap-3">
                    @for (service of services(); track service._id) {
                      <div>
                        <div class="d-flex justify-content-between align-items-start gap-2">
                          <p class="mb-0 fw-semibold" style="font-size: 0.92rem">
                            {{ service.title }}
                          </p>
                          <span class="pl-faded-link" style="font-size: 0.85rem">
                            {{ formatCurrency(service.price) }}
                          </span>
                        </div>
                        <pl-skill-tags [skillsObjects]="service.skills" />
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="pl-panel" style="top: 90px">
                <p class="pl-label">Skills</p>
                @if (user()!.skills.length === 0) {
                  <p class="pl-faint mb-0">No skills listed.</p>
                } @else {
                  <pl-skill-tags [skills]="user()!.skills" />
                }
              </div>
            </div>
          </div>
        </div>
      </section>
    }
  `,
})
export class UserProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly reviewService = inject(ReviewService);
  private readonly serviceService = inject(ServiceService);

  protected readonly loading = signal(true);
  protected readonly user = signal<User | null>(null);
  protected readonly reviews = signal<Review[]>([]);
  protected readonly pagination = signal<NonNullable<ReviewListData>['pagination'] | null>(null);
  protected readonly services = signal<Service[]>([]);

  protected readonly averageRating = computed(() => {
    const items = this.reviews();
    if (items.length === 0) return 0;
    return items.reduce((sum, review) => sum + review.rating, 0) / items.length;
  });
  protected readonly reviewsTotal = computed(
    () => this.pagination()?.total ?? 0,
  );

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.fetchReviews(1);
        this.fetchServices(user._id);
      },
      error: () => this.loading.set(false),
    });
  }

  private fetchReviews(page: number): void {
    const id = this.user()?._id ?? '';
    this.reviewService.getUserReviews(id, page, 5).subscribe({
      next: (data) => {
        this.reviews.set(data.reviews);
        this.pagination.set(data.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private fetchServices(id: string): void {
    this.serviceService.getServices().subscribe({
      next: (services) => {
        this.services.set(
          services.filter(
            (service) =>
              typeof service.freelancer === 'object' &&
              service.freelancer._id === id,
          ),
        );
      },
      error: () => void 0,
    });
  }

  goToPage(page: number): void {
    this.fetchReviews(page);
  }
}