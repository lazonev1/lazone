export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0);

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    const daysDiff = Math.round(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }
}
