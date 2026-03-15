import { motion } from 'framer-motion'
import { OverlayEnhancingState } from './overlay-enhancing-state'
import { OverlayProcessingState } from './overlay-processing-state'
import { OverlayRecordingState } from './overlay-recording-state'

type OverlayStatus = 'recording' | 'processing' | 'enhancing'

export function OverlayState({ status }: { status: OverlayStatus }) {
  return (
    <motion.div
      initial={{
        scale: 0,
        opacity: 0,
      }}
      exit={{
        scale: 0.8,
        opacity: 0,
      }}
      animate={{
        scale: 1,
        opacity: 1,
        transition: { duration: 0.25 },
      }}
      className="flex size-full items-center justify-center"
    >
      <motion.div
        exit={{
          width: 40,
          height: 40,
        }}
        initial={{
          width: 240,
          height: 40,
        }}
        animate={{
          width: status === 'recording' ? 240 : 40,
          height: 40,
        }}
        className="relative flex items-center justify-center overflow-hidden rounded-[999px] bg-[#315740] px-3"
      >
        {status === 'recording' && <OverlayRecordingState />}
        {status === 'processing' && <OverlayProcessingState />}
        {status === 'enhancing' && <OverlayEnhancingState />}
      </motion.div>
    </motion.div>
  )
}
