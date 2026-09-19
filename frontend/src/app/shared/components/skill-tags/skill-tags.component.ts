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
  readonly skillsObjects = input<{ _id: string; name: string }[]>([]);

  protected readonly tags = computed(() => {
    if (this.skills().length > 0) {
      return this.skills();
    }
    return this.skillsObjects().map((skill) => skill.name);
  });
}