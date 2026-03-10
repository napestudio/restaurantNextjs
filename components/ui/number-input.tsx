import { ComponentProps } from "react"
import { Input } from "@/components/ui/input"

type NumberInputProps = Omit<ComponentProps<"input">, "type">

function NumberInput(props: NumberInputProps) {
  return <Input type="number" {...props} />
}

export { NumberInput }
