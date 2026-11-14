import { motion, AnimatePresence } from "framer-motion";

export default function TopLoadingBar({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ scaleX: 0.15, opacity: 1 }}
          animate={{ scaleX: 0.92, opacity: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            transformOrigin: "left",
            background: "linear-gradient(90deg, #7F0F18, #E11D2E, #FF2D3D)",
            zIndex: 1200,
            boxShadow: "0 0 10px rgba(225, 29, 46, 0.7)"
          }}
        />
      )}
    </AnimatePresence>
  );
}
