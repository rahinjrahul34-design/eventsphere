import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input, Textarea, Label } from '../../components/ui/input';

import { EmptyState } from '../../components/ui/states';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { ListSkeleton } from '../../components/ui/skeleton';

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#db2777', '#0891b2', '#dc2626', '#4f46e5', '#ea580c', '#0d9488'];
const blank = { name: '', description: '', icon: 'Sparkles', color: COLORS[0] };

export default function AdminCategories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [toDelete, setToDelete] = useState(null);

  const q = useQuery({ queryKey: ['categories'], queryFn: endpoints.categories });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const save = useMutation({
    mutationFn: () => (editing ? endpoints.updateCategory(editing._id, form) : endpoints.createCategory(form)),
    onSuccess: () => { toast.success(editing ? 'Category updated' : 'Category created'); invalidate(); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: endpoints.deleteCategory,
    onSuccess: () => { toast.success('Category deleted'); invalidate(); setToDelete(null); },
    onError: (e) => toast.error(e.message),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (q.isLoading) return <ListSkeleton rows={6} />;
  const categories = q.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Categories</h2>
          <p className="text-sm text-muted-foreground">{categories.length} categories used in discovery.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}><Plus className="size-4" /> New category</Button>
      </div>

      {categories.length === 0 ? (
        <Card><CardContent><EmptyState icon={Tags} title="No categories" description="Create the first event category." /></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c._id} className="group">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                  <Tags className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.slug}</p>
                </div>
                <div className="flex opacity-0 transition group-hover:opacity-100">
                  <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '', icon: c.icon || 'Sparkles', color: c.color }); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(c)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'New category'}>
        <div className="grid gap-3">
          <div><Label required>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bootcamp" /></div>
          <div><Label>Description</Label><Textarea className="mt-1" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div>
            <Label>Color</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((col) => (
                <button key={col} type="button" aria-label={`Color ${col}`} onClick={() => set('color', col)}
                  className="size-8 rounded-full ring-offset-2 ring-offset-card transition"
                  style={{ backgroundColor: col, ...(form.color === col ? { boxShadow: `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${col}` } : {}) }} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => form.name && save.mutate()}>{editing ? 'Save' : 'Create'}</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete._id)}
        loading={del.isPending}
        variant="destructive"
        title="Delete category?"
        message="Categories in use by events cannot be deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}
