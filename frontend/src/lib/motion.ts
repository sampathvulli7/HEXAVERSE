// framer-motion v13's AnimatePresence exit animations hang under React 19:
// "exiting" components stay mounted forever — a stuck hero screen after the
// first send, suggestion dropdowns that linger, drawers that never close.
//
// This shim keeps every motion.* enter animation (those work fine) but turns
// AnimatePresence into an instant passthrough, so conditional children
// unmount immediately. We lose exit animations (cosmetic), we gain a UI that
// is always in the correct state. Import motion/AnimatePresence from here,
// never from 'framer-motion' directly.
import type { ReactNode } from 'react'

export { motion } from 'framer-motion'

export const AnimatePresence = ({ children }: { children?: ReactNode; mode?: string; initial?: boolean }) =>
  (children ?? null) as React.ReactElement | null
