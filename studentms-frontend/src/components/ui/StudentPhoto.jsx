import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function StudentPhoto({ photoUrl, studentId, className, alt = '' }) {
  const [image, setImage] = useState(null)
  useEffect(() => {
    if (!photoUrl) return
    const filename = photoUrl.split('/').pop()
    let active = true
    let objectUrl = null
    api.get('/profile-pictures/' + encodeURIComponent(filename), { responseType: 'blob' }).then(({ data }) => {
      objectUrl = URL.createObjectURL(data)
      if (active) setImage({ source: photoUrl, studentId, url: objectUrl })
      else URL.revokeObjectURL(objectUrl)
    }).catch(() => { if (active) setImage(null) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [photoUrl, studentId])
  const url = image?.source === photoUrl && image?.studentId === studentId ? image.url : null
  if (!url) return <div className={'bg-slate-200 dark:bg-slate-700 ' + className} />
  return <img src={url} alt={alt} className={className} />
}
