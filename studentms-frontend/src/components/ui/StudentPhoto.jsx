import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { absolutePhotoUrl } from '../../lib/assets';

export default function StudentPhoto({ photoUrl, studentId, className, alt = '' }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!photoUrl) {
      setImageUrl(null);
      return;
    }
    const fullUrl = absolutePhotoUrl(photoUrl);
    if (!fullUrl) return;

    let mounted = true;
    const fetchPhoto = async () => {
      try {
        const res = await api.get(fullUrl, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        if (mounted) setImageUrl(url);
      } catch (err) {
        console.error('Photo load failed', err);
        if (mounted) setImageUrl(null);
      }
    };
    fetchPhoto();
    return () => {
      mounted = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [photoUrl, studentId]);

  // Placeholder adapts to theme: light mode uses bg-slate-200, dark mode uses bg-slate-700
  if (!imageUrl) return <div className={`bg-slate-200 dark:bg-slate-700 ${className}`} />;
  return <img src={imageUrl} alt={alt} className={className} />;
}