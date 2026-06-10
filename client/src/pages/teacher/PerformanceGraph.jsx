import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Award, BookOpen, BarChart2, RefreshCw, ChevronDown, Target, Zap, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocumentsWhere, COLLECTIONS } from '../../api/apiService';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

const getGrade = pct =>
  pct>=90?{g:'A+',c:'text-emerald-600'}:pct>=80?{g:'A',c:'text-blue-600'}:
  pct>=70?{g:'B',c:'text-indigo-600'}:pct>=60?{g:'C',c:'text-amber-600'}:
  pct>=35?{g:'D',c:'text-orange-500'}:{g:'F',c:'text-red-600'};

// ── Pure SVG Line/Area Chart ───────────────────────────────────────────────
const LineChart = ({ data, keys, colors, height=220 }) => {
  const W=500, H=height, PL=30, PR=10, PT=10, PB=30;
  const cW=W-PL-PR, cH=H-PT-PB;
  if(!data.length||!keys.length) return <div className="flex items-center justify-center h-32 text-slate-300 text-sm">No data</div>;

  const allVals = data.flatMap(d=>keys.map(k=>d[k]).filter(v=>v!=null));
  const minV=0, maxV=100;
  const xStep = cW/(data.length-1||1);

  const pts = (key) => data.map((d,i)=>d[key]!=null?[PL+i*xStep, PT+cH-(d[key]-minV)/(maxV-minV)*cH]:null);

  const pathD = (points) => points.reduce((acc,p,i)=>{
    if(!p) return acc;
    const prev = points.slice(0,i).reverse().find(Boolean);
    return acc + (prev&&acc?`L${p[0]},${p[1]}`:`M${p[0]},${p[1]}`);
  },'');

  const areaD = (points) => {
    const first = points.find(Boolean), last = [...points].reverse().find(Boolean);
    if(!first||!last) return '';
    const line = pathD(points);
    return line + `L${last[0]},${PT+cH} L${first[0]},${PT+cH} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}}>
      {/* Grid lines */}
      {[0,25,50,75,100].map(v=>{
        const y=PT+cH-(v-minV)/(maxV-minV)*cH;
        return <g key={v}>
          <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
          <text x={PL-4} y={y+4} textAnchor="end" fill="#94a3b8" fontSize="10">{v}%</text>
        </g>;
      })}
      {/* Pass line */}
      {(() => { const y=PT+cH-(35-minV)/(maxV-minV)*cH; return <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="4,2"/>; })()}
      {/* X axis labels */}
      {data.map((d,i)=>(
        <text key={i} x={PL+i*xStep} y={H-4} textAnchor="middle" fill="#94a3b8" fontSize="9">
          {String(d.exam||'').slice(0,10)}
        </text>
      ))}
      {/* Lines + areas */}
      {keys.map((key,ki)=>{
        const points=pts(key), color=colors[ki%colors.length];
        return <g key={key}>
          <path d={areaD(points)} fill={color} fillOpacity="0.08"/>
          <path d={pathD(points)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {points.map((p,i)=>p&&<circle key={i} cx={p[0]} cy={p[1]} r="4" fill={color} stroke="white" strokeWidth="1.5"/>)}
        </g>;
      })}
    </svg>
  );
};

// ── Pure SVG Bar Chart ────────────────────────────────────────────────────
const BarChart = ({ data, colors, height=200 }) => {
  const W=500, H=height, PL=30, PR=10, PT=10, PB=30;
  const cW=W-PL-PR, cH=H-PT-PB;
  if(!data.length) return null;
  const barW=Math.min(cW/data.length*0.6, 40);
  const gap=cW/data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}}>
      {[0,25,50,75,100].map(v=>{
        const y=PT+cH-v/100*cH;
        return <g key={v}>
          <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
          <text x={PL-4} y={y+4} textAnchor="end" fill="#94a3b8" fontSize="10">{v}%</text>
        </g>;
      })}
      <line x1={PL} y1={PT+cH-(35/100)*cH} x2={W-PR} y2={PT+cH-(35/100)*cH} stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="4,2"/>
      {data.map((d,i)=>{
        const x=PL+gap*i+gap/2-barW/2, barH=(d.avg/100)*cH, y=PT+cH-barH;
        const color=colors[i%colors.length];
        return <g key={i}>
          <rect x={x} y={y} width={barW} height={barH} fill={color} rx="5" fillOpacity="0.85"/>
          <text x={x+barW/2} y={y-5} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">{d.avg}%</text>
          <text x={x+barW/2} y={H-4} textAnchor="middle" fill="#94a3b8" fontSize="9">
            {String(d.subject||'').slice(0,6)}
          </text>
        </g>;
      })}
    </svg>
  );
};

// ── Pure SVG Radar Chart ──────────────────────────────────────────────────
const RadarChart = ({ data, color='#6366f1', size=200 }) => {
  const cx=size/2, cy=size/2, r=size*0.38;
  const n=data.length; if(!n) return null;
  const angle=i=>(i/n)*2*Math.PI - Math.PI/2;
  const pt=(i,rad)=>[cx+rad*Math.cos(angle(i)), cy+rad*Math.sin(angle(i))];

  const gridLevels=[0.25,0.5,0.75,1];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{height:size}}>
      {/* Grid */}
      {gridLevels.map(lvl=>(
        <polygon key={lvl} points={data.map((_,i)=>pt(i,r*lvl).join(',')).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1"/>
      ))}
      {/* Spokes */}
      {data.map((_,i)=><line key={i} x1={cx} y1={cy} x2={pt(i,r)[0]} y2={pt(i,r)[1]} stroke="#e2e8f0" strokeWidth="1"/>)}
      {/* Data polygon */}
      <polygon points={data.map((d,i)=>pt(i,r*(d.score||0)/100).join(',')).join(' ')} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
      {/* Dots */}
      {data.map((d,i)=>{ const [x,y]=pt(i,r*(d.score||0)/100); return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1.5"/>; })}
      {/* Labels */}
      {data.map((d,i)=>{ const [x,y]=pt(i,r*1.2); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="10">{d.subject}</text>; })}
    </svg>
  );
};

// ── Legend ────────────────────────────────────────────────────────────────
const Legend = ({ keys, colors }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
    {keys.map((k,i)=>(
      <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="w-3 h-3 rounded-full" style={{background:colors[i%colors.length]}}/>
        {k}
      </span>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
export default function PerformanceGraph() {
  const { userData } = useAuth();
  const myClass = userData?.classAssigned;

  const [marksData,setMarksData]=useState([]);
  const [students,setStudents]=useState([]);
  const [selectedStu,setSelectedStu]=useState('all');
  const [loading,setLoading]=useState(false);

  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    if (!myClass) return;
    setLoading(true);
    try {
      const [marks, stuList] = await Promise.all([
        getDocumentsWhere(COLLECTIONS.MARKS, 'class', '==', myClass),
        getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass),
      ]);
      setMarksData(marks);
      setStudents(stuList);
      setLastUpdated(new Date());
    } finally { setLoading(false); }
  }, [myClass]);

  // Auto-refresh har 10 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);


  const examNames=useMemo(()=>[...new Set(marksData.map(m=>m.examName))].sort(),[marksData]);
  const subjects=useMemo(()=>[...new Set(marksData.map(m=>m.subject))],[marksData]);
  const stuMap=useMemo(()=>{const m={};students.forEach(s=>{m[(s.id||s._id)?.toString()]=s.name;});return m;},[students]);

  const lineData=useMemo(()=>examNames.map(exam=>{
    const row={exam};
    const recs=marksData.filter(m=>m.examName===exam);
    subjects.forEach(sub=>{
      const r=recs.find(m=>m.subject.toLowerCase()===sub.toLowerCase());
      if(!r) return;
      if(selectedStu==='all'){
        const vals=(r.marks||[]).filter(s=>s.status==='Present'&&s.marks!=null);
        if(vals.length) row[sub]=Math.round(vals.reduce((a,b)=>a+b.marks,0)/vals.length/(r.maxMarks||100)*100);
      } else {
        const e=(r.marks||[]).find(s=>s.studentId?.toString()===selectedStu);
        if(e?.status==='Present'&&e.marks!=null) row[sub]=Math.round((e.marks/(r.maxMarks||100))*100);
      }
    });
    return row;
  }),[examNames,marksData,subjects,selectedStu]);

  const barData=useMemo(()=>subjects.map(sub=>{
    const recs=marksData.filter(m=>m.subject.toLowerCase()===sub.toLowerCase());
    let sum=0,cnt=0;
    recs.forEach(r=>{
      if(selectedStu==='all'){
        const vals=(r.marks||[]).filter(s=>s.status==='Present'&&s.marks!=null);
        vals.forEach(s=>{sum+=(s.marks/(r.maxMarks||100))*100;cnt++;});
      } else {
        const e=(r.marks||[]).find(s=>s.studentId?.toString()===selectedStu);
        if(e?.status==='Present'&&e.marks!=null){sum+=(e.marks/(r.maxMarks||100))*100;cnt++;}
      }
    });
    return{subject:sub,avg:cnt>0?Math.round(sum/cnt):0};
  }).sort((a,b)=>b.avg-a.avg),[subjects,marksData,selectedStu]);

  const radarData=useMemo(()=>{
    if(!examNames.length) return [];
    const last=examNames[examNames.length-1];
    return subjects.map(sub=>{
      const r=marksData.find(m=>m.examName===last&&m.subject.toLowerCase()===sub.toLowerCase());
      let score=0;
      if(r){
        if(selectedStu==='all'){const vals=(r.marks||[]).filter(s=>s.status==='Present'&&s.marks!=null);score=vals.length?Math.round(vals.reduce((a,b)=>a+b.marks,0)/vals.length/(r.maxMarks||100)*100):0;}
        else{const e=(r.marks||[]).find(s=>s.studentId?.toString()===selectedStu);score=e?.status==='Present'&&e.marks!=null?Math.round((e.marks/(r.maxMarks||100))*100):0;}
      }
      return{subject:sub.slice(0,7),score};
    });
  },[examNames,subjects,marksData,selectedStu]);

  const rankData=useMemo(()=>{
    if(!examNames.length||!students.length) return [];
    const last=examNames[examNames.length-1];
    const recs=marksData.filter(m=>m.examName===last);
    return students.map(stu=>{
      const id=(stu.id||stu._id)?.toString();
      let total=0,maxTotal=0;
      recs.forEach(r=>{const e=(r.marks||[]).find(s=>s.studentId?.toString()===id);if(e?.status==='Present'&&e.marks!=null){total+=e.marks;maxTotal+=r.maxMarks||100;}});
      return{name:stu.name,rollNo:stu.rollNo,pct:maxTotal>0?Math.round((total/maxTotal)*100):0,total,maxTotal};
    }).filter(s=>s.maxTotal>0).sort((a,b)=>b.pct-a.pct);
  },[examNames,marksData,students]);

  const overallAvg=barData.length?Math.round(barData.reduce((a,b)=>a+b.avg,0)/barData.length):0;
  const trend=useMemo(()=>{
    if(lineData.length<2||!subjects.length) return null;
    const last=lineData[lineData.length-1],prev=lineData[lineData.length-2];
    const vals=subjects.filter(s=>last[s]!=null&&prev[s]!=null).map(s=>(last[s]||0)-(prev[s]||0));
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  },[lineData,subjects]);

  return (
    <div className="space-y-5 pb-8">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-3xl p-6 overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_20%,white,transparent_50%)]"/>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1"><BarChart2 className="w-4 h-4 text-white/70"/><span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Class {myClass}</span></div>
            <h1 className="text-2xl font-black text-white">Student Performance</h1>
            <p className="text-white/60 text-sm mt-1">Visual analysis of exam results & trends</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select value={selectedStu} onChange={e=>setSelectedStu(e.target.value)}
                className="appearance-none bg-white/15 text-white border border-white/20 rounded-xl px-4 py-2.5 pr-8 text-sm font-medium backdrop-blur-sm outline-none cursor-pointer">
                <option value="all" className="text-slate-800">📊 Class Average</option>
                {students.map(s=><option key={s.id||s._id} value={(s.id||s._id)?.toString()} className="text-slate-800">👤 {s.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-white/60 absolute right-2.5 top-3 pointer-events-none"/>
            </div>
            <button onClick={load} className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl border border-white/20 transition" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="relative text-white/40 text-xs mt-2 text-right">
            🔄 Auto-refresh: har 10s — Last: {lastUpdated.toLocaleTimeString('en-IN')}
          </p>
        )}
        {marksData.length>0&&(
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{label:'Total Exams',value:examNames.length,icon:Target},{label:'Subjects',value:subjects.length,icon:BookOpen},{label:'Students',value:students.length,icon:Users},{label:'Avg Score',value:`${overallAvg}%`,icon:Award}].map(s=>(
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 text-center">
                <s.icon className="w-4 h-4 text-white/60 mx-auto mb-1"/>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-white/50 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {marksData.length===0?(
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <BarChart2 className="w-16 h-16 text-slate-200 mx-auto mb-4"/>
          <h3 className="text-xl font-bold text-slate-700">No Exam Data Yet</h3>
          <p className="text-slate-400 mt-2">Enter student marks in the Exam Marks section to see graphs here.</p>
        </div>
      ):(
        <div className="space-y-5">
          {/* Line chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500"/>Exam-wise Performance Trend</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedStu==='all'?'Class average % per subject':'Student % per subject'}</p>
              </div>
              {trend!==null&&(
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${trend>0?'bg-emerald-50 text-emerald-600':trend<0?'bg-red-50 text-red-500':'bg-slate-50 text-slate-500'}`}>
                  {trend>0?<TrendingUp className="w-4 h-4"/>:trend<0?<TrendingDown className="w-4 h-4"/>:<Minus className="w-4 h-4"/>}
                  {trend>0?'+':''}{trend}% vs prev
                </span>
              )}
            </div>
            <LineChart data={lineData} keys={subjects} colors={COLORS} height={240}/>
            <Legend keys={subjects} colors={COLORS}/>
          </div>

          {/* Bar + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><BarChart2 className="w-5 h-5 text-blue-500"/>Subject-wise Average</h2>
              <BarChart data={barData} colors={COLORS} height={200}/>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-1"><Zap className="w-5 h-5 text-violet-500"/>Subject Strength Map</h2>
              <p className="text-xs text-slate-400 mb-3">Latest exam — {examNames[examNames.length-1]||'—'}</p>
              <div className="flex justify-center"><RadarChart data={radarData} color="#6366f1" size={200}/></div>
            </div>
          </div>

          {/* Rank table */}
          {rankData.length>0&&(
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500"/><h2 className="font-bold text-slate-800">Class Rank — {examNames[examNames.length-1]}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase">
                    <th className="px-5 py-3 text-left">Rank</th><th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-center">Roll No</th><th className="px-5 py-3 text-center">Marks</th>
                    <th className="px-5 py-3 text-center">%</th><th className="px-5 py-3 text-center">Grade</th>
                    <th className="px-5 py-3 text-right">Progress</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {rankData.map((stu,i)=>{const{g,c}=getGrade(stu.pct); return(
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i===0?'bg-amber-400 text-white':i===1?'bg-slate-300 text-white':i===2?'bg-orange-400 text-white':'bg-slate-100 text-slate-500'}`}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{stu.name}</td>
                        <td className="px-5 py-3.5 text-center text-slate-500">{stu.rollNo||'—'}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-700">{stu.total}/{stu.maxTotal}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-blue-600">{stu.pct}%</td>
                        <td className="px-5 py-3.5 text-center"><span className={`font-black text-lg ${c}`}>{g}</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{width:`${stu.pct}%`}}/>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
