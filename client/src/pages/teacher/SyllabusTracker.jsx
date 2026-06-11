import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Plus, Trash2, CheckCircle2, Clock, Circle,
  ChevronDown, ChevronUp, RefreshCw, Edit3, X, BarChart2,
  Sparkles, Target, TrendingUp, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocumentsWhere, updateDocument, deleteDocument, COLLECTIONS } from '../../api/apiService';

const uid = () => Math.random().toString(36).slice(2, 10);
const buildSyllabusId = (cls, subject) => `${cls}_${subject.trim()}`.replace(/\s+/g, '_');
const SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Computer Science','Sanskrit','Physical Education'];
const DURATIONS = ['30 mins','1 hour','1.5 hours','2 hours'];

const STATUS = {
  pending:     { label:'Not Started', bg:'bg-slate-100',  text:'text-slate-500',  ring:'border-slate-200', dot:'bg-slate-300',  glow:'' },
  in_progress: { label:'In Progress', bg:'bg-amber-50',   text:'text-amber-600',  ring:'border-amber-300', dot:'bg-amber-400',  glow:'shadow-amber-200' },
  completed:   { label:'Completed',   bg:'bg-emerald-50', text:'text-emerald-600',ring:'border-emerald-300',dot:'bg-emerald-500',glow:'shadow-emerald-200' },
};

export default function SyllabusTracker() {
  const { userData } = useAuth();
  const myClass = userData?.classAssigned;

  const [syllabusMap, setSyllabusMap]   = useState({});
  const [subjectList, setSubjectList]   = useState([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [expandedCh, setExpandedCh]     = useState({});
  const [showAddForm, setShowAddForm]   = useState(false);
  const [showAddSub, setShowAddSub]     = useState(false);
  const [newSubName, setNewSubName]     = useState('');
  const [editingId, setEditingId]       = useState(null);

  const [newTopic, setNewTopic]         = useState({ name:'', chapter:'', status:'pending', dateCovered:'', notes:'' });

  const loadSyllabus = useCallback(async () => {
    if (!myClass) return;
    setLoading(true);
    try {
      const records = await getDocumentsWhere(COLLECTIONS.SYLLABUS, 'class', '==', myClass);
      const map = {};
      records.forEach(r => {
        // Store both the MongoDB _id and the custom string id
        const mongoId = r._id || r.id;
        const customId = buildSyllabusId(myClass, r.subject);
        map[r.subject] = { id: mongoId, customId, topics: r.topics || [] };
      });
      setSyllabusMap(map);
      const subs = records.map(r => r.subject);
      setSubjectList(subs);
      if (!activeSubject && subs.length > 0) setActiveSubject(subs[0]);
    } finally { setLoading(false); }
  }, [myClass]);

  useEffect(() => { loadSyllabus(); }, [loadSyllabus]);

  const currentTopics = syllabusMap[activeSubject]?.topics || [];

  const stats = useMemo(() => {
    const total = currentTopics.length;
    const done  = currentTopics.filter(t => t.status === 'completed').length;
    const prog  = currentTopics.filter(t => t.status === 'in_progress').length;
    return { total, done, prog, pending: total - done - prog, pct: total > 0 ? Math.round((done/total)*100) : 0 };
  }, [currentTopics]);

  const grouped = useMemo(() => {
    const map = {};
    currentTopics.forEach(t => { const ch = t.chapter?.trim()||'General'; if(!map[ch]) map[ch]=[]; map[ch].push(t); });
    return map;
  }, [currentTopics]);

  const save = async (topics) => {
    if (!myClass || !activeSubject) return;
    setSaving(true);
    const docId = syllabusMap[activeSubject]?.id || buildSyllabusId(myClass, activeSubject);
    try {
      await updateDocument(COLLECTIONS.SYLLABUS, docId, { class: myClass, subject: activeSubject, createdBy: userData?.id || userData?._id, topics });
      setSyllabusMap(prev => ({ ...prev, [activeSubject]: { id: docId, topics } }));
    } finally { setSaving(false); }
  };

  const addTopic = async () => {
    if (!newTopic.name.trim()) { alert('Topic name required'); return; }
    await save([...currentTopics, { topicId: uid(), order: currentTopics.length, ...newTopic, name: newTopic.name.trim() }]);
    setNewTopic({ name:'', chapter:'', status:'pending', dateCovered:'', notes:'' });
    setShowAddForm(false);
  };

  const updateField = async (topicId, field, value) => {
    const updated = currentTopics.map(t => t.topicId === topicId
      ? { ...t, [field]: value, ...(field==='status'&&value==='completed'&&!t.dateCovered ? {dateCovered:new Date().toISOString().split('T')[0]} : {}) }
      : t);
    await save(updated);
  };

  const deleteTopic = async (topicId) => save(currentTopics.filter(t => t.topicId !== topicId));

  const doDeleteSubject = async (sub) => {
    setSaving(true);
    try {
      const entry = syllabusMap[sub];
      const mongoId = entry?.id;
      const customId = entry?.customId || buildSyllabusId(myClass, sub);

      // Try mongo _id first, then custom string id
      for (const id of [mongoId, customId].filter(Boolean)) {
        try {
          await deleteDocument(COLLECTIONS.SYLLABUS, id);
          break;
        } catch (e) { /* try next */ }
      }

      // Remove from local state
      const newMap = { ...syllabusMap };
      delete newMap[sub];
      setSyllabusMap(newMap);
      const newList = subjectList.filter(s => s !== sub);
      setSubjectList(newList);
      setActiveSubject(newList.length > 0 ? newList[0] : '');
    } catch (err) {
      console.error('deleteSubject error:', err);
    } finally { setSaving(false); }
  };

  const addSubject = async () => {
    const sub = newSubName.trim(); if (!sub) return;
    if (syllabusMap[sub]) { setActiveSubject(sub); setShowAddSub(false); return; }
    setSaving(true);
    const docId = buildSyllabusId(myClass, sub);
    await updateDocument(COLLECTIONS.SYLLABUS, docId, { class: myClass, subject: sub, createdBy: userData?.id || userData?._id, topics: [] });
    setSyllabusMap(prev => ({ ...prev, [sub]: { id: docId, topics: [] } }));
    setSubjectList(prev => [...prev, sub]);
    setActiveSubject(sub); setShowAddSub(false); setNewSubName(''); setSaving(false);
  };

  const cycleStatus = async (topic) => {
    const next = topic.status==='pending'?'in_progress':topic.status==='in_progress'?'completed':'pending';
    await updateField(topic.topicId, 'status', next);
  };

  const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '';

  // Color palette per subject index
  const subjectColors = ['from-blue-600 to-indigo-600','from-violet-600 to-purple-600','from-emerald-600 to-teal-600','from-orange-500 to-rose-500','from-cyan-600 to-blue-600','from-pink-600 to-rose-600','from-amber-500 to-orange-500','from-green-600 to-emerald-600'];
  const activeIdx = subjectList.indexOf(activeSubject);
  const activePalette = subjectColors[activeIdx % subjectColors.length] || 'from-blue-600 to-indigo-600';

  return (
    <div className="space-y-5 pb-8">


      <div className={`relative bg-gradient-to-br ${activePalette} rounded-3xl p-6 overflow-hidden shadow-xl`}>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent_60%)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Class {myClass}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Syllabus Tracker</h1>
            <p className="text-white/60 text-sm mt-1">Track topic-wise coverage for all subjects</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadSyllabus} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition backdrop-blur-sm border border-white/10">
              <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} />
            </button>
            <button onClick={() => setShowAddSub(true)} className="flex items-center gap-2 bg-white text-slate-800 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/90 transition shadow-lg">
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        </div>

        {/* Mini stats in header */}
        {activeSubject && stats.total > 0 && (
          <div className="relative mt-5 grid grid-cols-4 gap-3">
            {[
              { label:'Total', value: stats.total, icon: Layers },
              { label:'Done',  value: stats.done,  icon: CheckCircle2 },
              { label:'Active',value: stats.prog,  icon: Clock },
              { label:'Coverage', value:`${stats.pct}%`, icon: Target },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 text-center">
                <s.icon className="w-4 h-4 text-white/60 mx-auto mb-1" />
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-white/50 text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar in header */}
        {activeSubject && stats.total > 0 && (
          <div className="relative mt-4">
            <div className="flex justify-between text-xs text-white/60 mb-1.5">
              <span>{activeSubject} — {stats.done} of {stats.total} topics completed</span>
              <span className="font-bold text-white">{stats.pct}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-1000 ease-out" style={{ width:`${stats.pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── ADD SUBJECT PANEL ────────────────────────────────────────────── */}
      {showAddSub && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" /> New Subject</h3>
          <div className="flex gap-2">
            <input type="text" list="subj-opts" value={newSubName} onChange={e=>setNewSubName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addSubject()}
              placeholder="e.g. Mathematics" autoFocus
              className="flex-1 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            <datalist id="subj-opts">{SUBJECTS.map(s=><option key={s} value={s}/>)}</datalist>
            <button onClick={addSubject} disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Add</button>
            <button onClick={()=>setShowAddSub(false)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {subjectList.length === 0 && !loading ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">No Subjects Yet</h3>
          <p className="text-slate-400 mt-2 mb-6">Start tracking your syllabus by adding a subject.</p>
          <button onClick={()=>setShowAddSub(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            <Plus className="w-4 h-4 inline mr-2"/>Add First Subject
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── SUBJECT SIDEBAR ─────────────────────────────────────────── */}
          <div className="lg:w-56 flex-shrink-0 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Subjects</p>
            {subjectList.map((sub, i) => {
              const t = syllabusMap[sub]?.topics || [];
              const done = t.filter(x=>x.status==='completed').length;
              const pct  = t.length > 0 ? Math.round((done/t.length)*100) : 0;
              const pal  = subjectColors[i % subjectColors.length];
              const isActive = sub === activeSubject;
              return (
                <div key={sub} className="flex items-stretch gap-2">
                  {/* Subject select button — flex-1 */}
                  <button
                    onClick={() => setActiveSubject(sub)}
                    className={`flex-1 text-left p-3.5 rounded-2xl border transition-all duration-300 min-w-0 ${
                      isActive
                        ? `bg-gradient-to-r ${pal} text-white border-transparent shadow-lg`
                        : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 shadow-sm'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold truncate">{sub}</span>
                      <span className={`text-xs font-black flex-shrink-0 ml-1 ${isActive?'text-white/80':'text-slate-400'}`}>{pct}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isActive?'bg-white/20':'bg-slate-100'}`}>
                      <div className={`h-full rounded-full transition-all duration-700 ${isActive?'bg-white/80':`bg-gradient-to-r ${pal}`}`} style={{width:`${pct}%`}} />
                    </div>
                    <p className={`text-xs mt-1.5 ${isActive?'text-white/60':'text-slate-400'}`}>{done}/{t.length} done</p>
                  </button>

                  {/* Delete button — bilkul alag, side mein */}
                  <button
                    onClick={() => doDeleteSubject(sub)}
                    disabled={saving}
                    title={`Delete ${sub}`}
                    className="flex-shrink-0 w-9 rounded-2xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 flex items-center justify-center shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── TOPIC AREA ───────────────────────────────────────────────── */}
          <div className="flex-1 space-y-4">

            {/* Add Topic button / form */}
            {activeSubject && (showAddForm ? (
              <div className="bg-white rounded-2xl border border-blue-100 shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${activePalette} px-5 py-3.5 flex items-center justify-between`}>
                  <span className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>New Topic — {activeSubject}</span>
                  <button onClick={()=>setShowAddForm(false)} className="text-white/60 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Topic Name *</label>
                    <input type="text" value={newTopic.name} onChange={e=>setNewTopic(p=>({...p,name:e.target.value}))}
                      placeholder="e.g. Real Numbers" autoFocus
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Chapter / Unit</label>
                    <input type="text" value={newTopic.chapter} onChange={e=>setNewTopic(p=>({...p,chapter:e.target.value}))}
                      placeholder="e.g. Chapter 1"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</label>
                    <select value={newTopic.status} onChange={e=>setNewTopic(p=>({...p,status:e.target.value}))}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                      <option value="pending">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Date Covered</label>
                    <input type="date" value={newTopic.dateCovered} onChange={e=>setNewTopic(p=>({...p,dateCovered:e.target.value}))}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</label>
                    <input type="text" value={newTopic.notes} onChange={e=>setNewTopic(p=>({...p,notes:e.target.value}))}
                      placeholder="Optional teacher note"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"/>
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                    <button onClick={()=>setShowAddForm(false)} className="px-4 py-2.5 text-sm bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium">Cancel</button>
                    <button onClick={addTopic} disabled={saving} className={`px-6 py-2.5 text-sm text-white rounded-xl font-semibold bg-gradient-to-r ${activePalette} hover:opacity-90 disabled:opacity-50 shadow-lg transition`}>
                      {saving?'Saving...':'Add Topic'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={()=>setShowAddForm(true)}
                className="w-full group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 font-semibold text-sm transition-all duration-300 bg-white hover:bg-blue-50">
                <div className="w-7 h-7 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4"/>
                </div>
                Add New Topic to {activeSubject}
              </button>
            ))}

            {/* Chapter groups */}
            {Object.keys(grouped).length === 0 && activeSubject ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3"/>
                <p className="text-slate-400 font-medium">No topics yet. Click "Add New Topic" above.</p>
              </div>
            ) : Object.entries(grouped).map(([chapter, topics]) => {
              const chDone = topics.filter(t=>t.status==='completed').length;
              const chPct  = topics.length > 0 ? Math.round((chDone/topics.length)*100) : 0;
              const isOpen = expandedCh[chapter] !== false;
              return (
                <div key={chapter} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Chapter header */}
                  <div onClick={()=>setExpandedCh(p=>({...p,[chapter]:!isOpen}))}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activePalette} flex items-center justify-center shadow-sm`}>
                        <BookOpen className="w-4.5 h-4.5 text-white w-5 h-5"/>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{chapter}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{chDone} of {topics.length} topics completed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${activePalette} transition-all duration-700`} style={{width:`${chPct}%`}} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-8 text-right">{chPct}%</span>
                      </div>
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                      </div>
                    </div>
                  </div>

                  {/* Topic rows */}
                  {isOpen && (
                    <div className="border-t border-slate-50">
                      {topics.map((topic, idx) => {
                        const cfg = STATUS[topic.status] || STATUS.pending;
                        return (
                          <div key={topic.topicId}
                            className={`flex items-center gap-3 px-5 py-3.5 group transition-colors hover:bg-slate-50 ${idx!==0?'border-t border-slate-50':''}`}>
                            {/* Status toggle button */}
                            <button onClick={()=>cycleStatus(topic)} title="Click to change status"
                              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                topic.status==='completed'  ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200 text-white' :
                                topic.status==='in_progress'? 'border-amber-400 bg-amber-50 text-amber-500' :
                                'border-slate-200 bg-white hover:border-blue-400'
                              }`}>
                              {topic.status==='completed'   && <CheckCircle2 className="w-3.5 h-3.5"/>}
                              {topic.status==='in_progress' && <Clock className="w-3 h-3"/>}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {editingId === topic.topicId ? (
                                <input autoFocus defaultValue={topic.name}
                                  onBlur={e=>{updateField(topic.topicId,'name',e.target.value);setEditingId(null);}}
                                  onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape')setEditingId(null);}}
                                  className="text-sm font-semibold text-slate-800 border-b-2 border-blue-400 outline-none bg-transparent w-full"/>
                              ) : (
                                <p onClick={()=>setEditingId(topic.topicId)}
                                  className={`text-sm font-semibold cursor-text truncate ${topic.status==='completed'?'line-through text-slate-400':'text-slate-800'}`}>
                                  {topic.name}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                                  {cfg.label}
                                </span>
                                {topic.dateCovered && topic.status==='completed' && (
                                  <span className="text-xs text-slate-400">📅 {fmtDate(topic.dateCovered)}</span>
                                )}
                                {topic.notes && <span className="text-xs text-slate-400 italic truncate max-w-[200px]">"{topic.notes}"</span>}
                              </div>
                            </div>

                            {/* Actions - show on hover */}
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <select value={topic.status} onChange={e=>updateField(topic.topicId,'status',e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white text-slate-600 cursor-pointer">
                                <option value="pending">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <input type="date" value={topic.dateCovered||''} onChange={e=>updateField(topic.topicId,'dateCovered',e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none w-32"/>
                              <button onClick={()=>setEditingId(topic.topicId)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                                <Edit3 className="w-3.5 h-3.5"/>
                              </button>
                              <button onClick={()=>deleteTopic(topic.topicId)} className="p-1.5 text-red-500 md:text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
