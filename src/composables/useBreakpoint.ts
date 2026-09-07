import { useMediaQuery } from '@vueuse/core'

// Tailwind `md` (768px) — desktop/mobil chegarasi shu yerda belgilanadi.
const MD = '(min-width: 768px)'

export function useBreakpoint() {
  const isDesktop = useMediaQuery(MD)
  const isMobile = useMediaQuery(`not all and ${MD}`)

  return { isDesktop, isMobile }
}
