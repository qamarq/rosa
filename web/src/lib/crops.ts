import type { CropId } from "@/lib/types"

export const CROPS: { id: CropId; label: string }[] = [
  { id: "pszenica", label: "Pszenica" },
  { id: "kukurydza", label: "Kukurydza" },
  { id: "rzepak", label: "Rzepak" },
  { id: "ziemniaki", label: "Ziemniaki" },
  { id: "buraki", label: "Buraki" },
  { id: "laka", label: "Łąka" },
]

export function cropLabel(id: CropId): string {
  return CROPS.find((c) => c.id === id)?.label ?? id
}

export function isCropId(value: string): value is CropId {
  return CROPS.some((c) => c.id === value)
}
