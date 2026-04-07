import { useState } from "react";
import { StickyNote, Plus, Trash2, Save, X } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

const NOTE_COLORS = [
  { label: "Yellow", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-700/40" },
  { label: "Blue",   bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-200 dark:border-blue-700/40"   },
  { label: "Green",  bg: "bg-green-50 dark:bg-green-900/20",  border: "border-green-200 dark:border-green-700/40"  },
  { label: "Pink",   bg: "bg-pink-50 dark:bg-pink-900/20",   border: "border-pink-200 dark:border-pink-700/40"   },
  { label: "Purple", bg: "bg-purple-50 dark:bg-purple-900/20",border: "border-purple-200 dark:border-purple-700/40"},
];

const STORAGE_KEY = "ghs_student_notes";

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

const NotesTab = () => {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim() && !content.trim()) return;
    const newNote: Note = {
      id: Date.now().toString(),
      title: title.trim() || "Untitled",
      content: content.trim(),
      color: colorIdx.toString(),
      createdAt: new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setTitle(""); setContent(""); setColorIdx(0); setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">My Notes</h2>
          <p className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""} saved locally</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">New Note</p>
            <button onClick={() => { setShowForm(false); setTitle(""); setContent(""); }} className="p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color:</span>
            {NOTE_COLORS.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setColorIdx(i)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${c.bg} ${colorIdx === i ? "scale-125 border-foreground" : "border-transparent"}`}
                title={c.label}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!title.trim() && !content.trim()}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Save className="w-3.5 h-3.5" /> Save Note
          </button>
        </div>
      )}

      {/* Notes Grid */}
      {notes.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-card rounded-2xl shadow-card">
          <StickyNote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">No notes yet</p>
          <p className="text-sm text-muted-foreground">Tap "New Note" to write your first note</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map(note => {
            const color = NOTE_COLORS[parseInt(note.color)] || NOTE_COLORS[0];
            return (
              <div key={note.id} className={`relative rounded-2xl border p-4 shadow-sm ${color.bg} ${color.border}`}>
                {/* Delete confirm */}
                {deleteId === note.id ? (
                  <div className="absolute inset-0 bg-card/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10">
                    <p className="text-sm font-medium text-foreground">Delete this note?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(note.id)} className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-lg">Delete</button>
                      <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-foreground line-clamp-1">{note.title}</h4>
                  <button onClick={() => setDeleteId(note.id)} className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                {note.content && (
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-5 whitespace-pre-wrap">{note.content}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-3">{note.createdAt}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotesTab;
  
