import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import Modal from '../../components/ui/Modal'
import api from '../../lib/api'
import { getApiErrorMessage } from '../../lib/errors'

export default function SchoolClassModal({ catalog, courses, onClose }) {
  const qc = useQueryClient()
  const classes = catalog.flatMap(m => m.classes.map(c => ({ ...c, major: m.name })))
  const [selected, setSelected] = useState('')
  const [form, setForm] = useState({ name: '', major: '', courseCodes: [] })
  const save = useMutation({
    mutationFn: () => api.put('/catalog/classes', form),
    onSuccess: async () => {
      toast.success('班级课表已保存')
      await qc.invalidateQueries({ queryKey: ['school-course-catalog'] })
      await qc.invalidateQueries({ queryKey: ['students'] })
      onClose()
    },
    onError: error => toast.error(getApiErrorMessage(error)),
  })
  const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'
  return <Modal open title="专业、班级与课表" onClose={onClose} size="lg">
    <form onSubmit={e => { e.preventDefault(); save.mutate() }} className="space-y-4">
      <div><label className="block text-sm" htmlFor="school-class-select">选择班级</label><select id="school-class-select" className={input} value={selected} onChange={e => {
        setSelected(e.target.value)
        const c = classes.find(c => c.name === e.target.value)
        setForm(c ? { name: c.name, major: c.major, courseCodes: c.courseCodes } : { name: '', major: '', courseCodes: [] })
      }}><option value="">新增班级</option>{classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></div>
      <label className="block text-sm">专业<input className={input} value={form.major} required maxLength={255} list="major-names" onChange={e => setForm({ ...form, major: e.target.value })} /></label>
      <datalist id="major-names">{catalog.map(m => <option key={m.name} value={m.name} />)}</datalist>
      <label className="block text-sm">完整班级名称<input className={input} value={form.name} required maxLength={255} readOnly={Boolean(selected)} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <p className="text-xs text-slate-500">学生的班级名称应与此处一致。课表安排不会自动创建个人选课。</p>
      <fieldset className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-white/10"><legend>课表课程</legend>{courses.map(c => <label key={c.id} className="block text-sm">
        <input type="checkbox" className="mr-2" checked={form.courseCodes.includes(c.code)} onChange={e => setForm({ ...form, courseCodes: e.target.checked ? [...form.courseCodes, c.code] : form.courseCodes.filter(code => code !== c.code) })} />{c.code} · {c.title}
      </label>)}</fieldset>
      <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={save.isPending}>保存班级课表</button>
    </form>
  </Modal>
}
