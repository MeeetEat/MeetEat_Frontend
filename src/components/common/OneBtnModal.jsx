import { motion } from "framer-motion"

export default function OneBtnModal({ message, onConfirm }) {
  return (
    <>
      <div>
        {message}
      </div>
      <motion.button
        whileTap={{
          scale: 0.95,
          backgroundColor: "rgb(230,80,50)"
        }}
        className="flex flex-1 px-5 py-2 bg-primary text-white rounded-md justify-center items-center cursor-pointer"
        onClick={() => onConfirm()}
      >
        확인
      </motion.button>
    </>
  )
}

