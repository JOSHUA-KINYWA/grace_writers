/** Scroll within a panel only — avoids jumping the whole page (scrollIntoView on document). */

export function scrollContainerToBottom(
  container: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
) {
  if (!container) return
  container.scrollTo({ top: container.scrollHeight, behavior })
}

export function scrollContainerToElement(
  container: HTMLElement | null,
  element: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!container || !element) return
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const top =
    elementRect.top -
    containerRect.top +
    container.scrollTop -
    container.clientHeight / 2 +
    elementRect.height / 2
  container.scrollTo({ top: Math.max(0, top), behavior })
}
