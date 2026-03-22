import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, Upload, Download, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SyncItem {
  id: string;
  file: string;
  provider: string;
  action: 'upload' | 'download' | 'sync';
  status: 'syncing' | 'synced' | 'error';
  progress: number;
  timestamp: number;
}

interface CloudSyncProps {
  syncHistory: SyncItem[];
  onClearHistory: () => void;
}

export const CloudSync: React.FC<CloudSyncProps> = ({ syncHistory, onClearHistory }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'providers'>('history');

  const providers = [
    { id: 'web_os_cloud', name: 'WebOS Cloud', status: 'connected', storage: '1.2GB / 10GB' },
    { id: 'gdrive', name: 'Google Drive', status: 'simulated', storage: '15GB / 15GB' },
    { id: 'dropbox', name: 'Dropbox', status: 'simulated', storage: '2GB / 2GB' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#00FF41] font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#00FF41]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <span className="font-bold tracking-widest uppercase">Cloud Sync Engine</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-3 py-1 rounded border transition-all",
              activeTab === 'history' ? "bg-[#00FF41]/20 border-[#00FF41]" : "border-transparent hover:bg-[#00FF41]/10"
            )}
          >
            HISTORY
          </button>
          <button 
            onClick={() => setActiveTab('providers')}
            className={cn(
              "px-3 py-1 rounded border transition-all",
              activeTab === 'providers' ? "bg-[#00FF41]/20 border-[#00FF41]" : "border-transparent hover:bg-[#00FF41]/10"
            )}
          >
            PROVIDERS
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'history' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between opacity-60">
              <span>RECENT ACTIVITY</span>
              <button onClick={onClearHistory} className="hover:underline">CLEAR LOGS</button>
            </div>
            
            <AnimatePresence initial={false}>
              {syncHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                  <RefreshCw className="w-8 h-8 mb-2 animate-spin-slow" />
                  <span>NO RECENT SYNC ACTIVITY</span>
                </div>
              ) : (
                syncHistory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-[#111] border border-[#00FF41]/10 rounded-lg group hover:border-[#00FF41]/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.action === 'upload' ? <Upload className="w-3 h-3 text-blue-400" /> : 
                         item.action === 'download' ? <Download className="w-3 h-3 text-purple-400" /> : 
                         <RefreshCw className="w-3 h-3 text-green-400" />}
                        <span className="font-bold truncate max-w-[200px]">{item.file || 'System State'}</span>
                      </div>
                      <span className="text-[10px] opacity-40">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px]">
                      <div className="flex items-center gap-1 opacity-60">
                        <HardDrive className="w-3 h-3" />
                        <span>{item.provider}</span>
                      </div>
                      <div className="flex-1 h-1 bg-[#222] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          className={cn(
                            "h-full transition-all duration-300",
                            item.status === 'error' ? "bg-red-500" : "bg-[#00FF41]"
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-1 min-w-[60px] justify-end">
                        {item.status === 'synced' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-[#00FF41]" />
                            <span className="text-[#00FF41]">SYNCED</span>
                          </>
                        ) : item.status === 'error' ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <span className="text-red-500">FAILED</span>
                          </>
                        ) : (
                          <span className="animate-pulse">SYNCING {item.progress}%</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => (
              <div key={p.id} className="p-4 bg-[#111] border border-[#00FF41]/10 rounded-lg hover:border-[#00FF41]/40 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#00FF41]/10 rounded">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] opacity-40 uppercase tracking-tighter">{p.status}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    p.status === 'connected' ? "bg-[#00FF41] shadow-[0_0_8px_#00FF41]" : "bg-yellow-500"
                  )} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] opacity-60">
                    <span>STORAGE</span>
                    <span>{p.storage}</span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#00FF41]/40" 
                      style={{ width: p.id === 'web_os_cloud' ? '12%' : '100%' }} 
                    />
                  </div>
                </div>
                <button className="w-full mt-4 py-2 border border-[#00FF41]/20 rounded hover:bg-[#00FF41]/10 transition-all text-[10px] font-bold">
                  CONFIGURE PROVIDER
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#00FF41]/20 bg-[#0a0a0a] flex items-center justify-between opacity-60 text-[9px]">
        <span>SYNC ENGINE v2.4.0-STABLE</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <RefreshCw className="w-2 h-2 animate-spin-slow" />
            AUTO-SYNC ENABLED
          </span>
          <span>LATENCY: 14ms</span>
        </div>
      </div>
    </div>
  );
};
