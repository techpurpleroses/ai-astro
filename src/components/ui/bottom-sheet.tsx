'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  showHandle?: boolean
  showClose?: boolean
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  showHandle = true,
  showClose = true,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-40 bg-midnight-950/80 backdrop-blur-sm"
                />
              </Dialog.Overlay>

              {/* Sheet */}
              <Dialog.Content asChild>
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                  className={cn(
                    'fixed bottom-0 left-1/2 z-50 -translate-x-1/2',
                    'w-full max-w-[390px]',
                    'glass-card rounded-t-3xl',
                    'max-h-[90dvh] overflow-y-auto scrollbar-hide',
                    'pb-safe',
                    className,
                  )}
                >
                  {/* Handle bar */}
                  {showHandle && (
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="h-1 w-10 rounded-full bg-white/20" />
                    </div>
                  )}

                  {/* Header */}
                  {(title || showClose) && (
                    <div className="flex items-center justify-between px-5 py-3">
                      {title ? (
                        <Dialog.Title className="font-display text-base font-semibold text-text-primary">
                          {title}
                        </Dialog.Title>
                      ) : (
                        <div />
                      )}
                      {showClose && (
                        <Dialog.Close asChild>
                          <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-text-secondary transition-colors active:text-text-primary"
                            aria-label="Close"
                          >
                            <X size={16} />
                          </button>
                        </Dialog.Close>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="px-4 pb-6">{children}</div>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
