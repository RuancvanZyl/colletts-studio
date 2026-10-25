/** Built-in field-guide text for every animal. `cool` = "Did you know?", `fact` = about the animal, `hunt` = hunting notes. */
export interface GuideEntry { summary: string; cool: string[]; fact: string[]; hunt: string[]; tracks?: string }
export const e = (summary: string, cool: string[], fact: string[], hunt: string[], tracks?: string): GuideEntry => ({ summary, cool, fact, hunt, tracks });
