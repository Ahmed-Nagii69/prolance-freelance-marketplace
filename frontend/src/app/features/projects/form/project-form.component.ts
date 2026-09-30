import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { ToastService } from '../../../core/services/toast.service';
import { Project } from '../../../core/models/models';
import { extractApiMessage } from '../../../core/utils/http-error';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'pl-project-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingBlock],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <a routerLink="/projects" class="pl-faded-link">← Projects</a>
        <p class="pl-kicker" style="margin-top: 1.4rem">
          {{ isEdit() ? 'Client workspace' : 'Post a project' }}
        </p>
        <h1 class="pl-headline mb-0">
          {{ isEdit() ? 'Edit your brief' : 'Write a clear brief' }}
        </h1>
        <p class="pl-muted mt-2 mb-0" style="max-width: 56ch">
          The stronger the brief, the better the proposals. Include scope,
          context and what success looks like.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="row">
          <div class="col-12 col-lg-8">
            @if (isEdit() && loadingProject()) {
              <pl-loading />
            } @else {
              <div class="pl-panel">
                <form (ngSubmit)="save()" novalidate>
                  <div class="pl-field">
                    <label class="pl-label-inline" for="pf-title">Title</label>
                    <input
                      id="pf-title"
                      type="text"
                      class="pl-input"
                      required
                      maxlength="160"
                      [(ngModel)]="form.title"
                      name="title"
                      placeholder="e.g. E-commerce storefront rebuild"
                    />
                  </div>

                  <div class="pl-field">
                    <label class="pl-label-inline" for="pf-desc">Description</label>
                    <textarea
                      id="pf-desc"
                      class="pl-textarea"
                      required
                      maxlength="5000"
                      [(ngModel)]="form.description"
                      name="description"
                      placeholder="Scope, context, deliverables, references…"
                      style="min-height: 180px"
                    ></textarea>
                  </div>

                  <div class="row g-3">
                    <div class="col-12 col-sm-4">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="pf-min-budget">
                          Minimum budget (USD)
                        </label>
                        <input
                          id="pf-min-budget"
                          type="number"
                          class="pl-input"
                          required
                          min="1"
                          [(ngModel)]="form.minBudget"
                          name="minBudget"
                        />
                      </div>
                    </div>
                    <div class="col-12 col-sm-4">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="pf-max-budget">
                          Maximum budget (USD)
                        </label>
                        <input
                          id="pf-max-budget"
                          type="number"
                          class="pl-input"
                          required
                          min="1"
                          [(ngModel)]="form.maxBudget"
                          name="maxBudget"
                        />
                        <span class="pl-hint">
                          Freelancers bid anywhere inside this range.
                        </span>
                      </div>
                    </div>
                    <div class="col-12 col-sm-4">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="pf-duration">Duration (days)</label>
                        <input
                          id="pf-duration"
                          type="number"
                          class="pl-input"
                          required
                          min="1"
                          [(ngModel)]="form.durationDays"
                          name="durationDays"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="pl-field">
                    <label class="pl-label-inline" for="pf-skills">
                      Skills (comma separated, lowercase)
                    </label>
                    <input
                      id="pf-skills"
                      type="text"
                      class="pl-input"
                      [(ngModel)]="skillsCsv"
                      name="skills"
                      placeholder="typescript, react, node"
                    />
                    <span class="pl-hint">
                      These are free-form tags that help freelancers find your
                      project.
                    </span>
                  </div>

                  @if (error(); as message) {
                    <div
                      class="pl-message mb-3"
                      style="border-color: rgba(105,68,81,.4); color: var(--pl-burgundy)"
                      role="alert"
                    >
                      {{ message }}
                    </div>
                  }

                  <div class="d-flex gap-2 flex-wrap">
                    <button
                      type="submit"
                      class="pl-btn pl-btn--accent"
                      [disabled]="submitting()"
                    >
                      {{ submitting()
                        ? (isEdit() ? 'Saving…' : 'Posting…')
                        : (isEdit() ? 'Save changes' : 'Post project') }}
                    </button>
                    <a routerLink="/projects" class="pl-btn pl-btn--outline">
                      Cancel
                    </a>
                  </div>
                </form>
              </div>
            }
          </div>

          <div class="col-12 col-lg-4">
            <div class="pl-panel">
              <p class="pl-label">Tips for a strong brief</p>
              <ul class="mb-0" style="padding-left: 1.1rem; color: var(--pl-ink-soft); font-size: 0.92rem; display: grid; gap: 0.5rem">
                <li>Name the deliverable explicitly.</li>
                <li>Share relevant constraints and context.</li>
                <li>Define what done looks like.</li>
                <li>Choose skills that freelancers search by.</li>
                <li>Set a realistic duration and budget range.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ProjectForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly toast = inject(ToastService);

  protected readonly isEdit = signal(false);
  protected readonly loadingProject = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly form = {
    title: '',
    description: '',
    minBudget: null as number | null,
    maxBudget: null as number | null,
    durationDays: null as number | null,
  };
  protected skillsCsv = '';
  protected readonly editId = signal('');

  constructor() {
    const url = this.router.url;
    if (url.includes('/edit')) {
      const id = this.route.snapshot.paramMap.get('id') ?? '';
      this.isEdit.set(true);
      this.editId.set(id);
      this.loadProject(id);
    }
  }

  private loadProject(id: string): void {
    this.loadingProject.set(true);
    this.projectService.getProject(id).subscribe({
      next: (project) => {
        this.form.title = project.title;
        this.form.description = project.description;
        this.form.minBudget = project.minBudget;
        this.form.maxBudget = project.maxBudget;
        this.form.durationDays = project.durationDays;
        this.skillsCsv = project.skills.join(', ');
        this.loadingProject.set(false);
      },
      error: () => {
        this.loadingProject.set(false);
        void this.router.navigateByUrl('/projects');
      },
    });
  }

  save(): void {
    const { title, description, minBudget, maxBudget, durationDays } = this.form;
    if (!title.trim() || !description.trim() || !durationDays || durationDays < 1) {
      this.error.set('Title, description and a positive duration are required.');
      return;
    }
    if (!minBudget || !maxBudget) {
      this.error.set('Enter both a minimum and a maximum budget.');
      return;
    }
    if (maxBudget < minBudget) {
      this.error.set('The maximum budget cannot be lower than the minimum budget.');
      return;
    }

    const skills = this.skillsCsv
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0);
    const payload = {
      title,
      description,
      minBudget: Number(minBudget),
      maxBudget: Number(maxBudget),
      durationDays: Number(durationDays),
      skills,
    };

    this.submitting.set(true);
    this.error.set('');

    const operation = this.isEdit()
      ? this.projectService.updateProject(this.editId(), payload)
      : this.projectService.createProject(payload);

    operation.subscribe({
      next: (project) => {
        this.toast.success(
          this.isEdit() ? 'Project updated.' : 'Project posted.',
        );
        void this.router.navigateByUrl(`/projects/${project._id}`);
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'Unable to save the project.'));
        this.submitting.set(false);
      },
    });
  }
}