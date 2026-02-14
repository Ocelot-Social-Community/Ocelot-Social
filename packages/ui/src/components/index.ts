/**
 * Component exports
 *
 * Single source of truth for all components.
 * Add new components here - they will automatically be:
 * - Available as named exports: import { OsButton } from '@ocelot-social/ui'
 * - Registered globally when using the plugin: app.use(OcelotUI)
 */

export { OsButton, buttonVariants, type ButtonVariants } from './OsButton'
export {
  OsIcon,
  ICON_SIZES,
  IconBars,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconCopy,
  IconEye,
  IconEyeSlash,
  IconSearch,
  IconSpinner,
  SYSTEM_ICONS,
  type SystemIconName,
} from './OsIcon'
