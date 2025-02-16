import modalStore from "../../store/modalStore.js";
import { motion } from "framer-motion"
import { useState } from "react";

export default function TwoBtnModal({ message, onConfirm, reverseOrder = false }) {

  const buttons = [
    <motion.button
      key="no"
      whileTap={{ scale: 0.95 }}
      onClick={() => modalStore.closeModal()}
      className={`flex flex-1 items-center justify-center h-full px-5 py-2 rounded-md text-white ${reverseOrder ? "bg-primary" : "bg-secondary"}`}
    >
      아니요
    </motion.button>,
    <motion.button
      key="yes"
      whileTap={{ scale: 0.95 }}
      className={`flex flex-1 items-center justify-center h-full px-5 py-2 rounded-md text-white ${reverseOrder ? "bg-secondary" : "bg-primary"}`}
      onClick={() => onConfirm()}
    >
      예
    </motion.button>
  ];

  return (
    <>
      <div>{message}</div>
      <div className="flex gap-2 justify-center">
        {reverseOrder ? buttons.reverse() : buttons}
      </div>
    </>
  );
}

