import { ConcreteComponent } from 'vue'

// Storybook Component Type
export type SBComp = Omit<ConcreteComponent<unknown>, 'props'>
