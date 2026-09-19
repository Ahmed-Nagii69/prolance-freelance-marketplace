import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="pl-footer">
      <div class="pl-container">
        <div class="row g-4">
          <div class="col-12 col-md-5">
            <div class="pl-footer__brand">
              ProLance<span style="color: var(--pl-brass)">.</span>
            </div>
            <p style="max-width: 40ch; margin: 0">
              A considered marketplace for independent work — projects,
              proposals, contracts and reviews in one place.
            </p>
          </div>
          <div class="col-6 col-md-3">
            <p class="pl-kicker" style="color: rgba(245,241,232,.55)">Explore</p>
            <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
              <li><a routerLink="/projects">Projects</a></li>
              <li><a routerLink="/services">Services</a></li>
              <li><a routerLink="/skills">Skills</a></li>
            </ul>
          </div>
          <div class="col-6 col-md-3">
            <p class="pl-kicker" style="color: rgba(245,241,232,.55)">Account</p>
            <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
              <li><a routerLink="/auth/login">Log in</a></li>
              <li><a routerLink="/auth/register">Create an account</a></li>
            </ul>
          </div>
        </div>
        <hr class="pl-footer__rule" />
        <div class="pl-footer__bottom">
          <span>© {{ year }} ProLance. A freelance marketplace.</span>
          <span>Built on the ProLance API</span>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}