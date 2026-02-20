"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      className="toaster group"
      duration={3000}
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1a1714] group-[.toaster]:text-[#faf5eb] group-[.toaster]:border-[#2a2520] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#faf5eb]/60",
          actionButton:
            "group-[.toast]:bg-[#06B6D4] group-[.toast]:text-[#0f0d0a]",
          cancelButton:
            "group-[.toast]:bg-[#2a2520] group-[.toast]:text-[#faf5eb]/60",
          success:
            "group-[.toaster]:!border-[#10b981]/30",
          error:
            "group-[.toaster]:!border-[#ef4444]/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
