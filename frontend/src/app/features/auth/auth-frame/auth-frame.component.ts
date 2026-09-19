import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pl-auth-frame',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="pl-auth">
      <aside class="pl-auth__aside">
        <a routerLink="/" class="pl-brand" style="color: var(--pl-ivory)">
          ProLance<span class="pl-brand__dot">.</span>
        </a>
        <div class="pl-auth__aside-inner">
          <p class="pl-kicker" style="color: var(--pl-brass)">The marketplace</p>
          <h1 class="pl-headline pl-headline--inverse">
            Independent work, arranged with intent.
          </h1>
          <p class="pl-lede pl-lede--inverse">
            Post a brief, receive considered proposals, and move into a
            contract with people who care about the craft.
          </p>
        </div>
        <p class="pl-auth__aside-foot">
          Projects · Proposals · Contracts · Reviews
        </p>
      </aside>
      <section class="pl-auth__main">
        <div class="pl-auth__card">
          <ng-content />
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .pl-auth {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      }

      .pl-auth__aside {
        background-color: var(--pl-espresso);
        color: var(--pl-ivory);
        padding: 2.2rem 3rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 2rem;
      }

      .pl-auth__aside-inner {
        max-width: 46ch;
      }

      .pl-auth__aside-foot {
        font-size: 0.78rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(245, 241, 232, 0.5);
        margin: 0;
      }

      .pl-auth__main {
        background-color: var(--pl-ivory);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 5vh 2rem 3rem;
      }

      .pl-auth__card {
        width: min(430px, 100%);
      }

      @media (max-width: 991.98px) {
        .pl-auth {
          grid-template-columns: 1fr;
        }

        .pl-auth__aside {
          padding: 1.6rem 1.4rem 1.2rem;
          gap: 1.4rem;
        }

        .pl-auth__aside-inner .pl-headline {
          font-size: 1.7rem;
        }

        .pl-auth__aside-inner .pl-lede {
          font-size: 1rem;
        }

        .pl-auth__aside-foot {
          display: none;
        }

        .pl-auth__main {
          padding: 2rem 1.25rem;
        }
      }
    `,
  ],
})
export class AuthFrame {}