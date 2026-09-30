import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { PortfolioService } from '../../../core/services/portfolio.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { extractApiMessage } from '../../../core/utils/http-error';
import { formatDate } from '../../../core/utils/format';
import { PortfolioItem, PortfolioItemPayload } from '../../../core/models/models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';

const emptyForm = (): PortfolioItemPayload => ({
  title: '',
  description: '',
  image: '',
  category: '',
  technologies: [],
  projectUrl: '',
  linkUrl: '',
  linkLabel: '',
});

@Component({
  selector: 'pl-portfolio-section',
  standalone: true,
  imports: [
    FormsModule,
    TablerIconComponent,
    EmptyState,
    LoadingBlock,
    SkillTags,
  ],
  template: `
    <div class="head">
      <div>
        <p class="pl-label mb-1">Portfolio</p>
        <h2 class="pl-h3 mb-0">Previous work</h2>
      </div>
      @if (editable() && !formOpen()) {
        <button type="button" class="pl-btn pl-btn--accent pl-btn--sm" (click)="startCreate()">
          <tabler-icon icon="plus" [size]="18" />
          Add work
        </button>
      }
    </div>

    @if (loading()) {
      <pl-loading />
    } @else if (error()) {
      <div class="pl-message" style="color: var(--pl-burgundy)" role="alert">
        {{ error() }}
      </div>
    } @else if (editable() && formOpen()) {
      <form class="form" (ngSubmit)="save()" novalidate>
        <p class="pl-label mb-3">{{ editingId() ? 'Edit portfolio item' : 'New portfolio item' }}</p>

        <div class="pl-field">
          <label class="pl-label-inline" for="pf-title">Title</label>
          <input
            id="pf-title"
            type="text"
            class="pl-input"
            required
            maxlength="120"
            [(ngModel)]="title"
            name="title"
            placeholder="e.g. E-commerce storefront for a fashion brand"
          />
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="pf-description">Short description</label>
          <textarea
            id="pf-description"
            class="pl-textarea"
            required
            maxlength="1200"
            rows="4"
            [(ngModel)]="description"
            name="description"
            placeholder="What you built, your role and the outcome."
          ></textarea>
        </div>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <div class="pl-field">
              <label class="pl-label-inline" for="pf-category">Category / type</label>
              <input
                id="pf-category"
                type="text"
                class="pl-input"
                maxlength="60"
                [(ngModel)]="category"
                name="category"
                placeholder="e.g. Web application"
              />
            </div>
          </div>
          <div class="col-12 col-sm-6">
            <div class="pl-field">
              <label class="pl-label-inline" for="pf-tech">Technologies (comma separated)</label>
              <input
                id="pf-tech"
                type="text"
                class="pl-input"
                [(ngModel)]="technologiesCsv"
                name="technologies"
                placeholder="angular, node, postgres"
              />
            </div>
          </div>
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="pf-image">Image link</label>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <input
              id="pf-image"
              type="text"
              class="pl-input"
              [(ngModel)]="image"
              name="image"
              placeholder="https://…"
            />
            <button
              type="button"
              class="pl-btn pl-btn--outline pl-btn--sm"
              (click)="imageInput.click()"
              [disabled]="uploading()"
            >
              {{ uploading() ? 'Uploading…' : 'Upload' }}
            </button>
            <input
              #imageInput
              class="d-none"
              type="file"
              accept="image/*"
              (change)="onImageSelected($event)"
            />
          </div>
          <p class="pl-field-hint">Max 3 MB. PNG, JPG, GIF or WebP.</p>
        </div>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <div class="pl-field">
              <label class="pl-label-inline" for="pf-project-url">Project link</label>
              <input
                id="pf-project-url"
                type="text"
                class="pl-input"
                maxlength="500"
                [(ngModel)]="projectUrl"
                name="projectUrl"
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div class="col-12 col-sm-6">
            <div class="pl-field">
              <label class="pl-label-inline" for="pf-link-url">Additional link (optional)</label>
              <input
                id="pf-link-url"
                type="text"
                class="pl-input"
                maxlength="500"
                [(ngModel)]="linkUrl"
                name="linkUrl"
                placeholder="https://github.com/…"
              />
            </div>
          </div>
        </div>

        @if (editingId()) {
          <div class="pl-field">
            <label class="pl-label-inline" for="pf-link-label">Additional link label</label>
            <input
              id="pf-link-label"
              type="text"
              class="pl-input"
              maxlength="40"
              [(ngModel)]="linkLabel"
              name="linkLabel"
              placeholder="Case study"
            />
          </div>
        }

        @if (formError()) {
          <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
            {{ formError() }}
          </div>
        }

        <div class="d-flex gap-2">
          <button type="submit" class="pl-btn pl-btn--accent" [disabled]="saving()">
            {{ saving() ? 'Saving…' : editingId() ? 'Save changes' : 'Add to portfolio' }}
          </button>
          <button type="button" class="pl-btn pl-btn--outline" (click)="cancel()" [disabled]="saving()">
            Cancel
          </button>
        </div>
      </form>
    } @else if (items().length === 0) {
      <pl-empty-state
        [title]="editable() ? 'No portfolio work yet' : 'No previous work yet'"
        [body]="
          editable()
            ? 'Showcase your previous work to help clients understand your experience.'
            : 'This freelancer has not added portfolio work yet.'
        "
      >
        @if (editable()) {
          <button pl-empty-action type="button" class="pl-btn pl-btn--accent" (click)="startCreate()">
            Add your first work
          </button>
        }
      </pl-empty-state>
    } @else {
      <div class="grid">
        @for (item of items(); track item._id) {
          <article class="pl-card item">
            <div class="item__media">
              @if (item.image) {
                <img [src]="item.image" [alt]="item.title" loading="lazy" />
              } @else {
                <span class="item__placeholder">
                  <tabler-icon icon="photo" [size]="26" />
                </span>
              }
            </div>

            <div class="item__body">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <h3 class="pl-card__title mb-0">{{ item.title }}</h3>
                @if (item.category) {
                  <span class="pl-tag">{{ item.category }}</span>
                }
              </div>
              <p class="pl-card__meta mb-2">{{ formatDate(item.createdAt) }}</p>
              <p class="pl-card__body">{{ item.description }}</p>

              @if (item.technologies.length > 0) {
                <div class="mb-3">
                  <pl-skill-tags [skills]="item.technologies" />
                </div>
              }

              <div class="item__foot">
                @if (item.projectUrl) {
                  <a
                    class="pl-btn pl-btn--outline pl-btn--sm"
                    [href]="item.projectUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View project
                  </a>
                }
                @if (item.linkUrl) {
                  <a
                    class="pl-btn pl-btn--ghost pl-btn--sm"
                    [href]="item.linkUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ item.linkLabel || 'Case study' }}
                  </a>
                }
                @if (editable()) {
                  <span class="item__actions ms-auto">
                    <button
                      type="button"
                      class="pl-btn pl-btn--outline pl-btn--sm"
                      (click)="startEdit(item)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="pl-btn pl-btn--danger pl-btn--sm"
                      (click)="remove(item)"
                      [disabled]="deletingId() === item._id"
                    >
                      {{ deletingId() === item._id ? 'Deleting…' : 'Delete' }}
                    </button>
                  </span>
                }
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: [
    `
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
      }

      .form {
        border-top: 1px solid var(--pl-line);
        padding-top: 1.5rem;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      @media (max-width: 767.98px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }

      .item {
        padding: 0;
        overflow: hidden;
      }

      .item__media {
        aspect-ratio: 16 / 9;
        background-color: var(--pl-ivory-soft);
        border-bottom: 1px solid var(--pl-line);
        overflow: hidden;
      }

      .item__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .item__placeholder {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        color: var(--pl-ink-faint);
      }

      .item__body {
        padding: 1.2rem 1.3rem 1.3rem;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
      }

      .item__foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.6rem;
        border-top: 1px solid var(--pl-line);
        padding-top: 0.9rem;
        margin-top: auto;
      }

      .item__actions {
        display: inline-flex;
        gap: 0.5rem;
      }
    `,
  ],
})
export class PortfolioSection {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  /** Freelancer whose portfolio is displayed. Ignored when editable. */
  readonly freelancerId = input<string | null>(null);
  /** Enables add / edit / delete for the signed-in freelancer. */
  readonly editable = input(false);

  protected readonly items = signal<PortfolioItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly formError = signal('');
  protected readonly deletingId = signal<string | null>(null);

  protected title = '';
  protected description = '';
  protected image = '';
  protected category = '';
  protected technologiesCsv = '';
  protected projectUrl = '';
  protected linkUrl = '';
  protected linkLabel = '';

  protected readonly formatDate = formatDate;

  constructor() {
    effect(() => {
      const freelancerId = this.freelancerId();
      const editable = this.editable();
      if (!editable && !freelancerId) return;
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    const request = this.editable()
      ? this.portfolio.getMyPortfolio()
      : this.portfolio.getFreelancerPortfolio(this.freelancerId() ?? '');

    request.subscribe({
      next: (items) => {
        this.items.set(items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'We could not load the portfolio.'));
        this.loading.set(false);
      },
    });
  }

  protected startCreate(): void {
    const blank = emptyForm();
    this.title = blank.title;
    this.description = blank.description;
    this.image = blank.image;
    this.category = blank.category;
    this.technologiesCsv = '';
    this.projectUrl = blank.projectUrl;
    this.linkUrl = blank.linkUrl;
    this.linkLabel = blank.linkLabel;
    this.editingId.set(null);
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected startEdit(item: PortfolioItem): void {
    this.title = item.title;
    this.description = item.description;
    this.image = item.image;
    this.category = item.category;
    this.technologiesCsv = item.technologies.join(', ');
    this.projectUrl = item.projectUrl;
    this.linkUrl = item.linkUrl;
    this.linkLabel = item.linkLabel;
    this.editingId.set(item._id);
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected cancel(): void {
    this.formOpen.set(false);
    this.formError.set('');
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.formError.set('Please choose an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.formError.set('Image must be 3 MB or smaller.');
      return;
    }
    this.uploading.set(true);
    this.formError.set('');
    this.portfolio.uploadImage(file).subscribe({
      next: (data) => {
        this.image = data.image;
        this.uploading.set(false);
      },
      error: (err) => {
        this.formError.set(extractApiMessage(err, 'Unable to upload this image.'));
        this.uploading.set(false);
      },
    });
  }

  protected save(): void {
    const payload: PortfolioItemPayload = {
      title: this.title.trim(),
      description: this.description.trim(),
      image: this.image.trim(),
      category: this.category.trim(),
      technologies: this.technologiesCsv
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .slice(0, 15),
      projectUrl: this.projectUrl.trim(),
      linkUrl: this.linkUrl.trim(),
      linkLabel: this.linkLabel.trim(),
    };

    if (!payload.title || !payload.description) {
      this.formError.set('A title and a short description are required.');
      return;
    }

    const editingId = this.editingId();
    this.saving.set(true);
    this.formError.set('');

    const request = editingId
      ? this.portfolio.updateItem(editingId, payload)
      : this.portfolio.createItem(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(
          editingId ? 'Portfolio item updated.' : 'Portfolio item added.',
        );
        this.load();
      },
      error: (err) => {
        this.formError.set(
          extractApiMessage(err, 'Unable to save this portfolio item.'),
        );
        this.saving.set(false);
      },
    });
  }

  protected remove(item: PortfolioItem): void {
    this.confirm
      .confirm({
        title: 'Delete this portfolio item?',
        body: `“${item.title}” will be permanently removed from your portfolio.`,
        confirmLabel: 'Delete item',
        danger: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.deletingId.set(item._id);
        this.portfolio.deleteItem(item._id).subscribe({
          next: () => {
            this.deletingId.set(null);
            this.toast.success('Portfolio item deleted.');
            this.load();
          },
          error: (err) => {
            this.deletingId.set(null);
            this.toast.error(
              extractApiMessage(err, 'Unable to delete this portfolio item.'),
            );
          },
        });
      });
  }
}
