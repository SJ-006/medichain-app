import React from 'react';
import { useStore } from '../context/Store';
import { Database, ArrowDown } from 'lucide-react';

export const LedgerExplorer: React.FC = () => {
  const { ledger } = useStore();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Database className="text-primary" /> Access Audit Ledger
        </h2>
        <p className="text-slate-500 mt-2">
          Immutable log of all data access, uploads, and key generations. 
          Uses hash-linking to ensure integrity.
        </p>
      </div>

      <div className="relative border-l-2 border-slate-200 ml-6 space-y-8 pb-10">
        {ledger.slice().reverse().map((block, i) => (
          <div key={block.index} className="relative pl-8">
            {/* Timeline Dot */}
            <div className="absolute -left-[9px] top-0 bg-white border-2 border-slate-300 h-4 w-4 rounded-full" />
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider
                  ${block.action === 'ACCESS_DATA' ? 'bg-green-100 text-green-700' : 
                    block.action === 'REVOKE_ACCESS' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                  {block.action.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400 font-mono">Block #{block.index}</span>
              </div>
              
              <h4 className="font-semibold text-slate-800 mb-1">{block.details}</h4>
              <p className="text-xs text-slate-500 mb-4">{new Date(block.timestamp).toLocaleString()}</p>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-100 font-mono text-xs space-y-1 text-slate-600">
                <div className="flex gap-2">
                  <span className="w-16 text-slate-400">DataHash:</span> 
                  <span className="truncate">{block.dataHash}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 text-slate-400">PrevHash:</span> 
                  <span className="truncate">{block.previousHash.substring(0, 16)}...</span>
                </div>
                 <div className="flex gap-2">
                  <span className="w-16 text-slate-400">BlockHash:</span> 
                  <span className="text-primary font-bold truncate">{block.blockHash.substring(0, 16)}...</span>
                </div>
              </div>
            </div>

            {i < ledger.length - 1 && (
               <div className="absolute left-8 -bottom-6 text-slate-300">
                  <ArrowDown size={20} />
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};