import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
  input,
} from '@angular/core';

/**
 * Reveals an element the first time it scrolls into view.
 *
 * A single shared IntersectionObserver serves every instance, so a long landing
 * page costs one observer rather than one per element, and nothing runs on the
 * scroll thread. The observer disconnects once the last target has fired.
 *
 * The hiding class is only added when the browser can genuinely animate: with
 * reduced motion requested, or no IntersectionObserver support, the directive
 * returns without marking the element, so the content renders normally and can
 * never end up invisible.
 */
@Directive({ selector: '[plReveal]' })
export class Reveal implements OnInit, OnDestroy {
  /** Stagger in milliseconds, applied as a transition delay. */
  readonly plRevealDelay = input(0);
  /** Travel distance in pixels. */
  readonly plRevealShift = input(18);
  /** Set false to skip observation and leave the element untouched. */
  readonly plRevealEnabled = input(true);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private observed = false;

  ngOnInit(): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !this.plRevealEnabled() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const element = this.host.nativeElement;
    element.classList.add('pl-reveal');
    element.style.setProperty('--pl-reveal-delay', `${this.plRevealDelay()}ms`);
    element.style.setProperty('--pl-reveal-shift', `${this.plRevealShift()}px`);

    // The callback only toggles a class, so observation is registered outside
    // Angular and never triggers change detection on the scroll path.
    this.zone.runOutsideAngular(() => {
      Reveal.observe(element);
    });
    this.observed = true;
  }

  ngOnDestroy(): void {
    if (this.observed) {
      Reveal.release(this.host.nativeElement);
      this.observed = false;
    }
  }

  private static observer: IntersectionObserver | null = null;
  /** Targets the shared observer is still responsible for. Guards against
   *  double-settling one element, which would otherwise free the observer early
   *  and strand the remaining targets below their reveal threshold. */
  private static pending = new WeakSet<Element>();
  private static live = 0;

  private static observe(element: HTMLElement): void {
    if (!Reveal.observer) {
      Reveal.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            entry.target.classList.add('is-revealed');
            Reveal.settle(entry.target);
          }
        },
        // Fires a little before the element is fully in view, and requires a
        // sliver of it to be visible so a tall panel cannot trigger early.
        { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
      );
    }
    Reveal.pending.add(element);
    Reveal.live += 1;
    Reveal.observer.observe(element);
  }

  private static release(element: HTMLElement): void {
    if (!Reveal.observer) {
      return;
    }
    Reveal.settle(element);
  }

  private static settle(element: Element): void {
    const observer = Reveal.observer;
    if (!observer) {
      return;
    }
    // Already revealed, or already released. Counting it again would let the
    // observer be closed while other targets are still waiting.
    if (!Reveal.pending.delete(element)) {
      return;
    }
    observer.unobserve(element);
    Reveal.live = Math.max(0, Reveal.live - 1);
    if (Reveal.live === 0) {
      observer.disconnect();
      Reveal.observer = null;
    }
  }
}
