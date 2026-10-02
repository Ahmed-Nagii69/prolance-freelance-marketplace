import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import {
  CONTACT_LIMITS,
  ContactService,
  ContactTopic,
} from '../../core/services/contact.service';
import { extractApiMessage } from '../../core/utils/http-error';

const TOPICS: { value: ContactTopic; label: string; hint: string }[] = [
  { value: 'Account', label: 'Account', hint: 'Sign-in, profile or access' },
  { value: 'Project', label: 'Project', hint: 'A brief, listing or search' },
  { value: 'Contract', label: 'Contract', hint: 'Starting or closing a contract' },
  { value: 'Delivery', label: 'Delivery', hint: 'Submitted work or evidence' },
  { value: 'Dispute', label: 'Dispute', hint: 'An open or resolved dispute' },
  { value: 'Payments', label: 'Payments', hint: 'Escrow, refunds or payouts' },
  { value: 'General question', label: 'General question', hint: 'Anything else' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

@Component({
  selector: 'pl-contact',
  standalone: true,
  imports: [FormsModule, RouterLink, TablerIconComponent],
  template: `
    <section class="pl-contact-hero">
      <div class="pl-container">
        <div class="row g-5 align-items-start">
          <div class="col-12 col-lg-5">
            <p class="pl-kicker pl-kicker--accent">Contact &amp; support</p>
            <h1 class="pl-headline">Tell us what you need.</h1>
            <p class="pl-lede">
              Whether it is an account, a live project, a contract or a payment,
              write to the team and we will pick it up from there.
            </p>

            <ol class="pl-contact-topics">
              @for (topic of topics; track topic.value) {
                <li>
                  <button
                    type="button"
                    class="pl-contact-topic"
                    [class.is-selected]="form().topic === topic.value"
                    [attr.aria-pressed]="form().topic === topic.value"
                    (click)="pickTopic(topic.value)"
                  >
                    <span class="pl-contact-topic__label">{{ topic.label }}</span>
                    <span class="pl-contact-topic__hint">{{ topic.hint }}</span>
                  </button>
                </li>
              }
            </ol>

            <p class="pl-faint pl-contact-note">
              For a live contract, quoting its reference helps us find the record
              faster.
            </p>
          </div>

          <div class="col-12 col-lg-7">
            <div class="pl-panel pl-contact-form">
              @if (sent()) {
                <div class="pl-contact-done" role="status">
                  <span class="pl-contact-done__mark" aria-hidden="true">
                    <tabler-icon icon="circle-check" [size]="26" />
                  </span>
                  <h2 class="pl-h2 mb-1">Message sent successfully.</h2>
                  <p class="pl-muted mb-4">
                    We'll get back to you as soon as possible. If it is urgent,
                    reply to the notification email and it will reach the same
                    inbox faster.
                  </p>
                  <button
                    type="button"
                    class="pl-btn pl-btn--outline"
                    (click)="reset()"
                  >
                    Send another message
                  </button>
                </div>
              } @else {
                <form (ngSubmit)="submit()" novalidate>
                  <div class="pl-field">
                    <label class="pl-label-inline" for="ct-name">Name</label>
                    <input
                      id="ct-name"
                      name="name"
                      type="text"
                      class="pl-input"
                      [class.is-invalid]="!!fieldErrors().name"
                      [attr.aria-invalid]="fieldErrors().name ? true : null"
                      [attr.aria-describedby]="
                        fieldErrors().name ? 'ct-name-error' : null
                      "
                      [(ngModel)]="form().name"
                      autocomplete="name"
                      maxlength="80"
                      required
                    />
                    @if (fieldErrors().name; as message) {
                      <span class="pl-error" id="ct-name-error">{{ message }}</span>
                    }
                  </div>

                  <div class="pl-field">
                    <label class="pl-label-inline" for="ct-email">Email</label>
                    <input
                      id="ct-email"
                      name="email"
                      type="email"
                      class="pl-input"
                      [class.is-invalid]="!!fieldErrors().email"
                      [attr.aria-invalid]="fieldErrors().email ? true : null"
                      [attr.aria-describedby]="
                        fieldErrors().email ? 'ct-email-error' : 'ct-email-hint'
                      "
                      [(ngModel)]="form().email"
                      autocomplete="email"
                      maxlength="254"
                      placeholder="you@example.com"
                      required
                    />
                    @if (fieldErrors().email; as message) {
                      <span class="pl-error" id="ct-email-error">{{ message }}</span>
                    } @else {
                      <span class="pl-hint" id="ct-email-hint">
                        We use this to reply, and nothing else.
                      </span>
                    }
                  </div>

                  <div class="row g-3">
                    <div class="col-12 col-sm-6">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="ct-subject">Subject</label>
                        <input
                          id="ct-subject"
                          name="subject"
                          type="text"
                          class="pl-input"
                          [class.is-invalid]="!!fieldErrors().subject"
                          [attr.aria-invalid]="fieldErrors().subject ? true : null"
                          [attr.aria-describedby]="
                            fieldErrors().subject ? 'ct-subject-error' : null
                          "
                          [(ngModel)]="form().subject"
                          maxlength="120"
                          required
                        />
                        @if (fieldErrors().subject; as message) {
                          <span class="pl-error" id="ct-subject-error">
                            {{ message }}
                          </span>
                        }
                      </div>
                    </div>
                    <div class="col-12 col-sm-6">
                      <div class="pl-field">
                        <label class="pl-label-inline" for="ct-topic">
                          Topic <span class="pl-faint">(optional)</span>
                        </label>
                        <select
                          id="ct-topic"
                          name="topic"
                          class="pl-select"
                          [ngModel]="form().topic"
                          (ngModelChange)="pickTopic($event)"
                        >
                          <option value="">Not sure</option>
                          @for (topic of topics; track topic.value) {
                            <option [value]="topic.value">{{ topic.label }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  </div>

                  <div class="pl-field">
                    <label class="pl-label-inline" for="ct-message">Message</label>
                    <textarea
                      id="ct-message"
                      name="message"
                      class="pl-textarea"
                      [class.is-invalid]="!!fieldErrors().message"
                      [attr.aria-invalid]="fieldErrors().message ? true : null"
                      [attr.aria-describedby]="
                        fieldErrors().message ? 'ct-message-error' : 'ct-message-hint'
                      "
                      [(ngModel)]="form().message"
                      rows="7"
                      [maxlength]="limits.message.max"
                      required
                    ></textarea>
                    @if (fieldErrors().message; as message) {
                      <span class="pl-error" id="ct-message-error">{{ message }}</span>
                    } @else {
                      <span class="pl-hint" id="ct-message-hint">
                        The more detail you give, the faster we can help.
                      </span>
                    }
                    <span class="pl-contact-count" aria-live="polite">
                      {{ form().message.length }} / {{ limits.message.max }}
                    </span>
                  </div>

                  @if (error(); as message) {
                    <div class="pl-message mb-3" role="alert">
                      {{ message }}
                    </div>
                  }

                  <button
                    type="submit"
                    class="pl-btn pl-btn--dark pl-btn--block"
                    [disabled]="submitting()"
                  >
                    @if (submitting()) {
                      Sending…
                    } @else {
                      Send message
                    }
                  </button>

                  <p class="pl-faint pl-contact-note text-center">
                    Prefer to browse first? <a routerLink="/projects">See open projects</a>
                  </p>
                </form>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Contact {
  private readonly contactService = inject(ContactService);

  protected readonly topics = TOPICS;
  protected readonly limits = CONTACT_LIMITS;

  protected readonly form = signal({
    name: '',
    email: '',
    topic: '' as ContactTopic | '',
    subject: '',
    message: '',
  });

  protected readonly fieldErrors = signal<FieldErrors>({});
  protected readonly error = signal('');
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  /** Replaces the form object rather than mutating it, so the signal notifies
   *  and both the select and the topic list re-render together. */
  pickTopic(topic: ContactTopic | ''): void {
    this.form.update((current) => ({ ...current, topic }));
  }

  reset(): void {
    this.form.set({
      name: '',
      email: '',
      topic: '',
      subject: '',
      message: '',
    });
    this.fieldErrors.set({});
    this.error.set('');
    this.sent.set(false);
  }

  submit(): void {
    const current = this.form();
    const errors: FieldErrors = {};

    const name = current.name.trim();
    const email = current.email.trim();
    const subject = current.subject.trim();
    const message = current.message.trim();

    if (name.length < this.limits.name.min || name.length > this.limits.name.max) {
      errors.name = `Enter your name (at least ${this.limits.name.min} characters).`;
    }
    if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address so we can reply.';
    }
    if (subject.length < this.limits.subject.min || subject.length > this.limits.subject.max) {
      errors.subject = `Add a short subject (at least ${this.limits.subject.min} characters).`;
    }
    if (message.length < this.limits.message.min) {
      errors.message = 'Tell us a little more so we can help.';
    } else if (message.length > this.limits.message.max) {
      errors.message = `Please keep this under ${this.limits.message.max} characters.`;
    }

    this.fieldErrors.set(errors);
    this.error.set('');

    if (Object.keys(errors).length > 0) {
      // Send focus to the first problem so a keyboard user is not left hunting.
      queueMicrotask(() => this.focusFirstError(errors));
      return;
    }

    this.submitting.set(true);
    this.contactService
      .send({ name, email, topic: current.topic, subject, message })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sent.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          // extractApiMessage only ever returns the API's own `message`, which is
          // written for visitors. Provider and SMTP detail never reaches here.
          this.error.set(extractApiMessage(err, 'Your message could not be sent. Please try again.'));
        },
      });
  }

  private focusFirstError(errors: FieldErrors): void {
    const order: (keyof FieldErrors)[] = ['name', 'email', 'subject', 'message'];
    const first = order.find((key) => errors[key]);
    if (!first) {
      return;
    }
    const element = document.getElementById(`ct-${first}`);
    if (element instanceof HTMLElement) {
      element.focus();
    }
  }
}
