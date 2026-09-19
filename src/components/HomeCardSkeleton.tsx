export default function HomeCardSkelleton() {
    return (
        <div className="h-full bg-white rounded-2xl border border-slate-200 p-7 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-slate-200 mb-5" />
            <div className="h-5 w-2/3 bg-slate-200 rounded mb-3" />
            <div className="h-4 w-full bg-slate-200 rounded mb-2" />
            <div className="h-4 w-4/5 bg-slate-200 rounded mb-6" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
    );
}