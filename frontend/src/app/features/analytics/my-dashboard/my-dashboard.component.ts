import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { FreelancerDashboard } from '../freelancer-dashboard/freelancer-dashboard.component';
import { ClientDashboard } from '../client-dashboard/client-dashboard.component';

@Component({
  selector: 'pl-my-dashboard',
  standalone: true,
  imports: [FreelancerDashboard, ClientDashboard],
  template: `
    @switch (role()) {
      @case ('FREELANCER') {
        <pl-freelancer-dashboard />
      }
      @case ('CLIENT') {
        <pl-client-dashboard />
      }
    }
  `,
})
export class MyDashboard {
  private readonly auth = inject(AuthService);

  protected readonly role = computed(() => this.auth.user()?.role);
}
