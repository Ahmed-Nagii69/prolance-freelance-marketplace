import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'pl-skill-tags',
  standalone: true,
  template: `
    <div class="d-flex flex-wrap gap-1">
      @for (skillName of tags(); track skillName) {
        <span class="pl-tag">{{ skillName }}</span>
      }
    </div>
  `,
})
export class SkillTags {
  readonly skills = input<string[]>([]);

  protected readonly tags = computed(() => this.skills());
}