"use client";

import { useState } from "react";

interface Props {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied!",
  className = "h-8 px-2 rounded border border-white/8 bg-surface text-xs font-semibold text-strong transition-colors hover:bg-elevated",
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? copiedLabel : label}
    </button>
  );
}
