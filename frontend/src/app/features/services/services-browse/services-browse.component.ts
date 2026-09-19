import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceService } from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { Service } from '../../../core/models/models';
import { formatCurrency, initialsOf } from '../../../core/utils/format';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'pl-services-browse',
  standalone: true,
  imports: [RouterLink, SkillTags, LoadingBlock, EmptyState,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
          <div>
            <p class="pl-kicker">Offered pre-packaged work</p>
            <h1 class="pl-headline mb-0">Services</h1>
            <p class="pl-muted mt-2 mb-0" style="max-width: 56ch">
              Buy a defined service at a fixed price. No back-and-forth — the
              freelancer has described exactly what you get.
            </p>
          </div>
          @if (isFreelancer()) {
            <a routerLink="/services/new" class="pl-btn pl-btn--accent">
              Offer a service
            </a>
          }
        </div>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (services().length === 0) {
          <pl-empty-state
            title="No services listed"
            body="Freelancers haven't listed fixed-price services yet. Check back soon or post a project instead."
          >
            <a routerLink="/projects" class="pl-btn pl-btn--outline pl-btn--sm" pl-empty-action>
              Browse projects instead
            </a>
          </pl-empty-state>
        } @else {
          <div class="row g-4">
            @for (service of services(); track service._id) {
              <div class="col-12 col-sm-6 col-lg-4">
                <div class="pl-card h-100">
                  <div class="d-flex justify-content-between align-items-start gap-3">
                    <h3 class="pl-card__title mb-1" style="font-size: 1.05rem">
                      {{ service.title }}
                    </h3>
                    <span class="pl-price">{{ formatCurrency(service.price) }}</span>
                  </div>
                  <p class="pl-card__body" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden">
                    {{ service.description }}
                  </p>
                  <div class="pl-card__foot">
                    <div class="d-flex align-items-center gap-2">
                      <span class="pl-avatar">{{ initialsOf(service.freelancer.name) }}</span>
                      <div style="min-width: 0">
                        <p class="mb-0 fw-semibold" style="font-size: 0.9rem">
                          {{ service.freelancer.name }}
                        </p>
                        <p class="pl-faint mb-0" style="font-size: 0.78rem">
                          Freelancer
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3">
                    <pl-skill-tags [skillsObjects]="service.skills" />
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ServicesBrowse {
  private readonly serviceService = inject(ServiceService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly services = signal<Service[]>([]);
  protected readonly formatCurrency = formatCurrency;
  protected readonly initialsOf = initialsOf;
  protected readonly isFreelancer = computed(() =>
    this.auth.hasRole('FREELANCER'),
  );

  constructor() {
    this.serviceService.getServices().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}