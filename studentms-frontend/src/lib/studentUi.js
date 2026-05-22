export function pctForCourse(courseId, title) {
  const s = `${courseId}:${title}`
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i) * 17) % 997
  return 35 + (h % 55)
}
