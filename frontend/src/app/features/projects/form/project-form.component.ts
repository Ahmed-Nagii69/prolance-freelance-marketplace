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
                    <div class="col-12 col-sm-6">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="pf-budget">Budget (USD)</label>
                        <input
                          id="pf-budget"
                          type="number"
                          class="pl-input"
                          required
                          min="1"
                          [(ngModel)]="form.budget"
                          name="budget"
                        />
                      </div>
                    </div>
                    <div class="col-12 col-sm-6">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="pf-deadline">Deadline</label>
                        <input
                          id="pf-deadline"
                          type="date"
                          class="pl-input"
                          required
                          [min]="today()"
                          [(ngModel)]="form.deadline"
                          name="deadline"
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
                <li>Set a realistic deadline and budget.</li>
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
    budget: null as number | null,
    deadline: '',
  };
  protected skillsCsv = '';
  protected readonly editId = signal('');

  protected readonly today = (): string => {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  };

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
        this.form.budget = project.budget;
        this.form.deadline = project.deadline.slice(0, 10);
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
    const { title, description, budget, deadline } = this.form;
    if (!title.trim() || !description.trim() || !budget || !deadline) {
      this.error.set('Title, description, budget and a future deadline are required.');
      return;
    }

    const skills = this.skillsCsv
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0);
    const payload = { title, description, budget: Number(budget), deadline, skills };

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