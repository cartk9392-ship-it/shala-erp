import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Award, BookOpen, BarChart2, RefreshCw, Zap, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getDocuments, COLLECTIONS } from '../../api/apiService';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

const getGrade = pct =>
  pct>=90?{g:'A+',c:'text-emerald-600',bg:'bg-emerald-50'}:pct>=80?{g:'A',c:'text-blue-600',bg:'bg-blue-50'}:
  pct>=70?{g:'B',c:'text-indigo-600',bg:'bg-indigo-50'}:pct>=60?{g:'C',c:'text-amber-600',bg:'bg-amber-50'}:
  pct>=35?{g:'D',c:'text-orange-500',bg:'bg-orange-50'}:{g:'F',c:'text-red-600',bg:'bg-red-50'};

// Pure SVG Line Chart
const LineChart = ({ data, keys, colors, height=220 }) => {
  const W=500,H=height,PL=32,PR=10,PT=10,PB=32,cW=W-PL-PR,cH=H-PT-PB;
  if(!data.length||!keys.length) return <div className="h-28 flex items-center justify-center text-slate-300 text-sm">No data yet</div>;
  const xStep=cW/(data.length-1||1);
  const pts=key=>data.map((d,i)=>d[key]!=null?[PL+i*xStep,PT+cH-(d[key]/100)*cH]:null);
  const pathD=points=>points.reduce((acc,p,i)=>{
    if(!p) return acc;
    return acc+(acc?`L${p[0]},${p[1]}`:`M${p[0]},${p[1]}`);
  },'');
  const areaD=points=>{
    const first=points.find(Boolean),last=[...points].reverse().find(Boolean);
    if(!first||!last) return '';
    return pathD(points)+`L${last[0]},${PT+cH} L${first[0]},${PT+cH} Z`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}}>
      {[0,25,50,75,100].map(v=>{const y=PT+cH-(v/100)*cH;return(
        <g key={v}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
        <text x={PL-4} y={y+4} textAnchor="end" fill="#94a3b8" fontSize="10">{v}%</text></g>
      );})}
      <line x1={PL} y1={PT+cH-(35/100)*cH} x2={W-PR} y2={PT+cH-(35/100)*cH} stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="4,2"/>
      {data.map((d,i)=><text key={i} x={PL+i*xStep} y={H-4} textAnchor="middle" fill="#94a3b8" fontSize="9">{String(d.exam||'').slice(0,10)}</text>)}
      {keys.map((key,ki)=>{const points=pts(key),color=colors[ki%colors.length];return(
        <g key={key}>
          <path d={areaD(points)} fill={color} fillOpacity="0.1"/>
          <path d={pathD(points)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {points.map((p,i)=>p&&<circle key={i} cx={p[0]} cy={p[1]} r="4" fill={color} stroke="white" strokeWidth="1.5"/>)}
        </g>
      );})}
    </svg>
  );
};

// Pure SVG Bar Chart
const BarChart = ({ data, colors, height=190 }) => {
  const W=500,H=height,PL=32,PR=10,PT=10,PB=30,cW=W-PL-PR,cH=H-PT-PB;
  if(!data.length) return null;
  const barW=Math.min(cW/data.length*0.55,38),gap=cW/data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}}>
      {[0,25,50,75,100].map(v=>{const y=PT+cH-(v/100)*cH;return(
        <g key={v}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
        <text x={PL-4} y={y+4} textAnchor="end" fill="#94a3b8" fontSize="10">{v}%</text></g>
      );})}
      <line x1={PL} y1={PT+cH-(35/100)*cH} x2={W-PR} y2={PT+cH-(35/100)*cH} stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="4,2"/>
      {data.map((d,i)=>{const x=PL+gap*i+gap/2-barW/2,barH=(d.avg/100)*cH,y=PT+cH-barH,color=colors[i%colors.length];return(
        <g key={i}>
          <rect x={x} y={y} width={barW} height={barH} fill={color} rx="5" fillOpacity="0.85"/>
          <text x={x+barW/2} y={y-5} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">{d.avg}%</text>
          <text x={x+barW/2} y={H-4} textAnchor="middle" fill="#94a3b8" fontSize="9">{String(d.subject||'').slice(0,6)}</text>
        </g>
      );})}
    </svg>
  );
};

// Pure SVG Radar
const RadarChart = ({ data, color='#8b5cf6', size=200 }) => {
  const cx=size/2,cy=size/2,r=size*0.36,n=data.length;
  if(!n) return null;
  const angle=i=>(i/n)*2*Math.PI-Math.PI/2;
  const pt=(i,rad)=>[cx+rad*Math.cos(angle(i)),cy+rad*Math.sin(angle(i))];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{height:size}}>
      {[0.25,0.5,0.75,1].map(l=><polygon key={l} points={data.map((_,i)=>pt(i,r*l).join(',')).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1"/>)}
      {data.map((_,i)=><line key={i} x1={cx} y1={cy} x2={pt(i,r)[0]} y2={pt(i,r)[1]} stroke="#e2e8f0" strokeWidth="1"/>)}
      <polygon points={data.map((d,i)=>pt(i,r*(d.score||0)/100).join(',')).join(' ')} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
      {data.map((d,i)=>{const[x,y]=pt(i,r*(d.score||0)/100);return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1.5"/>;} )}
      {data.map((d,i)=>{const[x,y]=pt(i,r*1.25);return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="10">{d.subject}</text>;} )}
    </svg>
  );
};

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

export default function ViewPerformance() {
  const { userData } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [marksData, setMarksData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    const sid = userData?.studentId;
    if (!sid) return;
    setLoading(true);
    try {
      const [child, allMarks] = await Promise.all([
        getDocument(COLLECTIONS.STUDENTS, sid.toString()),
        getDocuments(COLLECTIONS.MARKS)
      ]);
      setStudentInfo(child);
      setMarksData(allMarks.filter(m => (m.marks || []).some(s => s.studentId?.toString() === sid.toString())));
      setLastUpdated(new Date());
    } finally { setLoading(false); }
  }, [userData?.studentId]);

  // Auto-refresh har 10 seconds
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);


  const sid=userData?.studentId?.toString();
  const subjects=useMemo(()=>[...new Set(marksData.map(m=>m.subject))],[marksData]);
  const examNames=useMemo(()=>[...new Set(marksData.map(m=>m.examName))].sort(),[marksData]);

  const lineData=useMemo(()=>examNames.map(exam=>{
    const row={exam},recs=marksData.filter(m=>m.examName===exam);
    subjects.forEach(sub=>{
      const r=recs.find(m=>m.subject.toLowerCase()===sub.toLowerCase());
      if(!r) return;
      const e=(r.marks||[]).find(s=>s.studentId?.toString()===sid);
      if(e?.status==='Present'&&e.marks!=null) row[sub]=Math.round((e.marks/(r.maxMarks||100))*100);
    });
    return row;
  }),[examNames,marksData,subjects,sid]);

  const subjectAvg=useMemo(()=>subjects.map(sub=>{
    const recs=marksData.filter(m=>m.subject.toLowerCase()===sub.toLowerCase());
    let sum=0,cnt=0;
    recs.forEach(r=>{const e=(r.marks||[]).find(s=>s.studentId?.toString()===sid);if(e?.status==='Present'&&e.marks!=null){sum+=(e.marks/(r.maxMarks||100))*100;cnt++;}});
    return{subject:sub,avg:cnt>0?Math.round(sum/cnt):0};
  }).sort((a,b)=>b.avg-a.avg),[subjects,marksData,sid]);

  const radarData=useMemo(()=>{
    if(!examNames.length) return [];
    const last=examNames[examNames.length-1];
    return subjects.map(sub=>{
      const r=marksData.find(m=>m.examName===last&&m.subject.toLowerCase()===sub.toLowerCase());
      const e=r?(r.marks||[]).find(s=>s.studentId?.toString()===sid):null;
      const score=e?.status==='Present'&&e.marks!=null?Math.round((e.marks/(r.maxMarks||100))*100):0;
      return{subject:sub.slice(0,7),score};
    });
  },[examNames,subjects,marksData,sid]);

  const overall=useMemo(()=>{
    if(!subjectAvg.length) return null;
    const avg=Math.round(subjectAvg.reduce((a,b)=>a+b.avg,0)/subjectAvg.length);
    return{avg,best:subjectAvg[0],weak:[...subjectAvg].sort((a,b)=>a.avg-b.avg)[0]};
  },[subjectAvg]);

  const trend=useMemo(()=>{
    if(lineData.length<2||!subjects.length) return null;
    const last=lineData[lineData.length-1],prev=lineData[lineData.length-2];
    const vals=subjects.filter(s=>last[s]!=null&&prev[s]!=null).map(s=>(last[s]||0)-(prev[s]||0));
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  },[lineData,subjects]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 rounded-3xl p-6 overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_20%,white,transparent_50%)]"/>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{studentInfo?.name||'Loading...'} · Class {studentInfo?.class||'—'}</p>
            <h1 className="text-2xl font-black text-white">My Performance</h1>
            <p className="text-white/60 text-sm mt-1">Track your marks & progress across all exams</p>
          </div>
          <button onClick={load} className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl border border-white/20 transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
        </div>
        {lastUpdated && (
          <p className="relative text-white/40 text-xs mt-2 text-right">
            🔄 Auto-refresh: har 10s — Last: {lastUpdated.toLocaleTimeString('en-IN')}
          </p>
        )}
        {overall&&(
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{label:'Overall Avg',value:`${overall.avg}%`,icon:BarChart2},{label:'Grade',value:getGrade(overall.avg).g,icon:Award},{label:'Best Subject',value:overall.best?.subject?.slice(0,8)||'—',icon:Zap},{label:'Total Exams',value:examNames.length,icon:BookOpen}].map(s=>(
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
          <h3 className="text-xl font-bold text-slate-700">No Results Yet</h3>
          <p className="text-slate-400 mt-2">Your teacher hasn't entered any exam marks yet.</p>
        </div>
      ):(
        <div className="space-y-5">
          {/* Summary cards */}
          {overall&&(
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {label:'Overall Performance',value:`${overall.avg}%`,sub:getGrade(overall.avg).g+' Grade',color:'from-indigo-500 to-blue-500',icon:Award},
                {label:'Best Subject',value:overall.best?.subject||'—',sub:`${overall.best?.avg||0}% average`,color:'from-emerald-500 to-teal-500',icon:TrendingUp},
                {label:'Needs Improvement',value:overall.weak?.subject||'—',sub:`${overall.weak?.avg||0}% average`,color:'from-orange-400 to-rose-500',icon:TrendingDown},
              ].map(c=>(
                <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-5 text-white shadow-lg`}>
                  <c.icon className="w-5 h-5 text-white/70 mb-2"/>
                  <p className="text-2xl font-black truncate">{c.value}</p>
                  <p className="text-white/70 text-sm mt-0.5">{c.sub}</p>
                  <p className="text-white/50 text-xs mt-3 uppercase tracking-wider font-semibold">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Line chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500"/>Exam-wise Progress</h2>
                <p className="text-xs text-slate-400 mt-0.5">Your % score per subject across all exams</p>
              </div>
              {trend!==null&&(
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${trend>0?'bg-emerald-50 text-emerald-600':trend<0?'bg-red-50 text-red-500':'bg-slate-50 text-slate-500'}`}>
                  {trend>0?<TrendingUp className="w-4 h-4"/>:trend<0?<TrendingDown className="w-4 h-4"/>:<Minus className="w-4 h-4"/>}
                  {trend>0?'+':''}{trend}% trend
                </span>
              )}
            </div>
            <LineChart data={lineData} keys={subjects} colors={COLORS} height={240}/>
            <Legend keys={subjects} colors={COLORS}/>
          </div>

          {/* Bar + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><BarChart2 className="w-5 h-5 text-blue-500"/>Subject Average</h2>
              <BarChart data={subjectAvg} colors={COLORS} height={190}/>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-1"><Zap className="w-5 h-5 text-violet-500"/>Strength Map</h2>
              <p className="text-xs text-slate-400 mb-3">Latest exam — {examNames[examNames.length-1]||'—'}</p>
              <div className="flex justify-center"><RadarChart data={radarData} color="#8b5cf6" size={200}/></div>
            </div>
          </div>

          {/* Subject grade cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjectAvg.map((s,i)=>{const{g,c,bg}=getGrade(s.avg);return(
              <div key={s.subject} className={`${bg} rounded-2xl p-4 border border-slate-100`}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{s.subject}</p>
                <p className={`text-3xl font-black mt-1 ${c}`}>{g}</p>
                <p className="text-sm font-bold text-slate-600 mt-0.5">{s.avg}%</p>
                <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${s.avg}%`,background:COLORS[i%COLORS.length]}}/>
                </div>
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
}
